/**
 * Locus Engine — Overpass Amenity Profile Provider
 *
 * Fetches real counts per amenity category and safety infrastructure in a
 * single Overpass request using named sets (`.set out count;`).
 * Enforces zero fabrication and strict null-vs-zero semantics.
 */

import type { Measured } from "../../domain/types";
import type { AmenityProfileResult, AmenityProvider } from "./types";
import type { HttpClient } from "../../infra/httpClient";
import { OVERPASS_MIRRORS_CONFIG } from "../localities/overpass";
import { RateLimitQueue } from "../../infra/queue";
import {
  OVERPASS_CONCURRENCY,
  OVERPASS_MIN_SPACING_MS,
  QUERY_RADII,
  CACHE_TTL_AMENITIES_MS
} from "../../config";

interface OverpassCountElement {
  type: string;
  id: number;
  tags?: {
    nodes?: string;
    ways?: string;
    relations?: string;
    total?: string;
  };
}

interface OverpassCountResponse {
  elements?: OverpassCountElement[];
}

/**
 * Builds the single-request multi-category Overpass QL query.
 * Uses exact radii configured in QUERY_RADII.
 */
export function buildAmenityProfileQuery(coords: { lat: number; lon: number }): string {
  const { lat, lon } = coords;
  return `[out:json][timeout:25];
nwr["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${QUERY_RADII.healthcare}, ${lat}, ${lon})->.health;
nwr["amenity"~"^(school|college|kindergarten|university)$"](around:${QUERY_RADII.education}, ${lat}, ${lon})->.education;
nwr["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](around:${QUERY_RADII.grocery}, ${lat}, ${lon})->.grocery;
nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${QUERY_RADII.food}, ${lat}, ${lon})->.food;
nwr["leisure"~"^(park|garden|fitness_centre|playground)$"](around:${QUERY_RADII.leisure}, ${lat}, ${lon})->.leisure;
nwr["highway"="bus_stop"](around:${QUERY_RADII.busStops}, ${lat}, ${lon})->.bus;
nwr["railway"~"^(station|subway_entrance)$"](around:${QUERY_RADII.railStations}, ${lat}, ${lon})->.rail;
nwr["amenity"="police"](around:${QUERY_RADII.safetyInfrastructure}, ${lat}, ${lon})->.police;
way["lit"="yes"](around:${QUERY_RADII.safetyInfrastructure}, ${lat}, ${lon})->.litRoads;
node["man_made"="surveillance"](around:${QUERY_RADII.safetyInfrastructure}, ${lat}, ${lon})->.surveillance;

.health out count;
.education out count;
.grocery out count;
.food out count;
.leisure out count;
.bus out count;
.rail out count;
.police out count;
.litRoads out count;
.surveillance out count;
`;
}

/**
 * Creates an unavailable profile when network or service fails.
 */
export function createUnavailableProfile(reason: string): AmenityProfileResult {
  const unavailableMetric = (note: string): Measured<number> => ({
    value: null,
    source: "unavailable",
    confidence: "none",
    note
  });

  return {
    amenities: {
      healthcare: unavailableMetric(reason),
      education: unavailableMetric(reason),
      grocery: unavailableMetric(reason),
      food: unavailableMetric(reason),
      leisure: unavailableMetric(reason),
      busStops: unavailableMetric(reason),
      railStations: unavailableMetric(reason)
    },
    safety: {
      policeCount: unavailableMetric(reason),
      litRoadsCount: unavailableMetric(reason),
      surveillanceCount: unavailableMetric(reason),
      coverageNote: reason
    },
    totalMappedObjects: 0
  };
}

/**
 * Pure parser for Overpass count responses.
 * Assigns confidence based on local mapping density, preserving real zeros.
 */
export function parseAmenityResponse(raw: unknown, fetchedAt?: string): AmenityProfileResult {
  if (!raw || typeof raw !== "object") {
    return createUnavailableProfile("Empty or invalid Overpass response");
  }

  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as OverpassCountResponse;

  if (!Array.isArray(data.elements) || data.elements.length < 7) {
    return createUnavailableProfile("Malformed Overpass count response: insufficient count elements");
  }

  const parseCount = (index: number): number => {
    const el = data.elements?.[index];
    if (!el || !el.tags || el.tags.total === undefined) return 0;
    const count = parseInt(el.tags.total, 10);
    return isNaN(count) ? 0 : count;
  };

  const healthCount = parseCount(0);
  const eduCount = parseCount(1);
  const groceryCount = parseCount(2);
  const foodCount = parseCount(3);
  const leisureCount = parseCount(4);
  const busCount = parseCount(5);
  const railCount = parseCount(6);

  const policeCount = data.elements.length > 7 ? parseCount(7) : 0;
  const litCount = data.elements.length > 8 ? parseCount(8) : 0;
  const survCount = data.elements.length > 9 ? parseCount(9) : 0;

  const totalMapped = healthCount + eduCount + groceryCount + foodCount + leisureCount + busCount + railCount;

  // Determine coverage confidence
  let confidence: "high" | "medium" | "low" = "high";
  let coverageNote: string | undefined;

  if (totalMapped < 10) {
    confidence = "low";
    coverageNote = "Sparse OpenStreetMap coverage in this locality";
  } else if (totalMapped < 30) {
    confidence = "medium";
    coverageNote = "Moderate OpenStreetMap coverage";
  }

  const makeMeasured = (val: number): Measured<number> => ({
    value: val,
    source: "osm",
    confidence,
    note: coverageNote,
    fetchedAt: fetchedAt || (typeof root.fetchedAt === "string" ? root.fetchedAt : undefined)
  });

  // Safety infrastructure indicator
  const safetyTotal = policeCount + litCount + survCount;
  const safetyConfidence = safetyTotal === 0 ? "none" : (safetyTotal < 3 ? "low" : "medium");
  const safetyNote = "infrastructure indicator, not crime data";

  return {
    amenities: {
      healthcare: makeMeasured(healthCount),
      education: makeMeasured(eduCount),
      grocery: makeMeasured(groceryCount),
      food: makeMeasured(foodCount),
      leisure: makeMeasured(leisureCount),
      busStops: makeMeasured(busCount),
      railStations: makeMeasured(railCount)
    },
    safety: {
      policeCount: {
        value: policeCount,
        source: "osm",
        confidence: safetyConfidence,
        note: safetyNote,
        fetchedAt
      },
      litRoadsCount: {
        value: litCount,
        source: "osm",
        confidence: safetyConfidence,
        note: safetyNote,
        fetchedAt
      },
      surveillanceCount: {
        value: survCount,
        source: "osm",
        confidence: safetyConfidence,
        note: safetyNote,
        fetchedAt
      },
      coverageNote: safetyNote
    },
    totalMappedObjects: totalMapped
  };
}

export class OverpassAmenityProvider implements AmenityProvider {
  private queue: RateLimitQueue;

  constructor(
    private http: HttpClient,
    queue?: RateLimitQueue
  ) {
    this.queue =
      queue ??
      new RateLimitQueue({
        concurrency: OVERPASS_CONCURRENCY,
        minSpacingMs: OVERPASS_MIN_SPACING_MS
      });
  }

  async getProfile(
    coords: { lat: number; lon: number },
    signal?: AbortSignal
  ): Promise<AmenityProfileResult> {
    const query = buildAmenityProfileQuery(coords);
    const cacheKey = `overpass:amenities:${coords.lat.toFixed(4)},${coords.lon.toFixed(4)}`;

    try {
      const response = await this.http.post<OverpassCountResponse>(
        OVERPASS_MIRRORS_CONFIG,
        "interpreter",
        `data=${encodeURIComponent(query)}`,
        {
          signal,
          cacheKey,
          cacheTtlMs: CACHE_TTL_AMENITIES_MS,
          queue: this.queue,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...(typeof window === "undefined"
              ? { "User-Agent": "Locus/0.1.0 (https://github.com/AniruddhaK07/Locus)" }
              : {})
          }
        }
      );

      return parseAmenityResponse(response);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      return createUnavailableProfile(`Overpass amenity query failed: ${message}`);
    }
  }
}
