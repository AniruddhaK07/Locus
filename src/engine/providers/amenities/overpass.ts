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
import { haversineDistanceKm } from "../../domain/geo";

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
 * Builds a combined multi-locality Overpass QL query for a batch of localities (e.g. up to 4).
 * Uses named sets per locality with exact configured radii.
 */
export function buildBatchAmenityProfileQuery(localities: Array<{ lat: number; lon: number }>): string {
  let query = "[out:json][timeout:25];\n";
  localities.forEach((loc, idx) => {
    const { lat, lon } = loc;
    query += `nwr["amenity"~"^(hospital|clinic|pharmacy|doctors)$"](around:${QUERY_RADII.healthcare}, ${lat}, ${lon})->.health_${idx};\n`;
    query += `nwr["amenity"~"^(school|college|kindergarten|university)$"](around:${QUERY_RADII.education}, ${lat}, ${lon})->.education_${idx};\n`;
    query += `nwr["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](around:${QUERY_RADII.grocery}, ${lat}, ${lon})->.grocery_${idx};\n`;
    query += `nwr["amenity"~"^(restaurant|cafe|fast_food|food_court)$"](around:${QUERY_RADII.food}, ${lat}, ${lon})->.food_${idx};\n`;
    query += `nwr["leisure"~"^(park|garden|fitness_centre|playground)$"](around:${QUERY_RADII.leisure}, ${lat}, ${lon})->.leisure_${idx};\n`;
    query += `nwr["highway"="bus_stop"](around:${QUERY_RADII.busStops}, ${lat}, ${lon})->.bus_${idx};\n`;
    query += `nwr["railway"~"^(station|subway_entrance)$"](around:${QUERY_RADII.railStations}, ${lat}, ${lon})->.rail_${idx};\n`;
    query += `nwr["amenity"="police"](around:${QUERY_RADII.safetyInfrastructure}, ${lat}, ${lon})->.police_${idx};\n`;
    query += `way["lit"="yes"](around:${QUERY_RADII.safetyInfrastructure}, ${lat}, ${lon})->.litRoads_${idx};\n`;
    query += `node["man_made"="surveillance"](around:${QUERY_RADII.safetyInfrastructure}, ${lat}, ${lon})->.surveillance_${idx};\n`;
  });

  localities.forEach((_, idx) => {
    query += `.health_${idx} out count;\n`;
    query += `.education_${idx} out count;\n`;
    query += `.grocery_${idx} out count;\n`;
    query += `.food_${idx} out count;\n`;
    query += `.leisure_${idx} out count;\n`;
    query += `.bus_${idx} out count;\n`;
    query += `.rail_${idx} out count;\n`;
    query += `.police_${idx} out count;\n`;
    query += `.litRoads_${idx} out count;\n`;
    query += `.surveillance_${idx} out count;\n`;
  });

  return query;
}

/**
 * Calculates the bounding box enclosing localities expanded by bufferKm.
 */
export function computeLocalitiesBoundingBox(
  localities: Array<{ lat: number; lon: number }>,
  bufferKm: number = 3.0
): {
  bbox: [number, number, number, number]; // [south, west, north, east]
  areaKm2: number;
} {
  if (localities.length === 0) {
    return { bbox: [0, 0, 0, 0], areaKm2: 0 };
  }

  let minLat = localities[0].lat;
  let maxLat = localities[0].lat;
  let minLon = localities[0].lon;
  let maxLon = localities[0].lon;

  for (const loc of localities) {
    if (loc.lat < minLat) minLat = loc.lat;
    if (loc.lat > maxLat) maxLat = loc.lat;
    if (loc.lon < minLon) minLon = loc.lon;
    if (loc.lon > maxLon) maxLon = loc.lon;
  }

  const bufferDegLat = bufferKm / 111.0;
  const avgLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const bufferDegLon = bufferKm / (111.0 * Math.cos(avgLatRad));

  const south = minLat - bufferDegLat;
  const north = maxLat + bufferDegLat;
  const west = minLon - bufferDegLon;
  const east = maxLon + bufferDegLon;

  const heightKm = (north - south) * 111.0;
  const widthKm = (east - west) * 111.0 * Math.cos(avgLatRad);
  const areaKm2 = heightKm * widthKm;

  return {
    bbox: [south, west, north, east],
    areaKm2
  };
}

/**
 * Builds an envelope query to fetch matching elements within a single bounding box.
 */
export function buildEnvelopeAmenityQuery(bbox: [number, number, number, number]): string {
  const [south, west, north, east] = bbox;
  const bboxStr = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
  return `[out:json][timeout:25];
(
  nwr["amenity"~"^(hospital|clinic|pharmacy|doctors|school|college|kindergarten|university|restaurant|cafe|fast_food|food_court|police)$"](${bboxStr});
  nwr["shop"~"^(supermarket|convenience|grocery|greengrocer)$"](${bboxStr});
  nwr["leisure"~"^(park|garden|fitness_centre|playground)$"](${bboxStr});
  nwr["highway"="bus_stop"](${bboxStr});
  nwr["railway"~"^(station|subway_entrance)$"](${bboxStr});
  way["lit"="yes"](${bboxStr});
  node["man_made"="surveillance"](${bboxStr});
);
out center tags;
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

/**
 * Parses batch Overpass count responses into an array of AmenityProfileResult matching the order of localities.
 */
export function parseBatchAmenityResponse(
  raw: unknown,
  batchCount: number,
  fetchedAt?: string
): AmenityProfileResult[] {
  if (!raw || typeof raw !== "object") {
    return Array.from({ length: batchCount }, () =>
      createUnavailableProfile("Empty or invalid Overpass response")
    );
  }

  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as OverpassCountResponse;
  const elements = data.elements || [];

  const results: AmenityProfileResult[] = [];
  const CATEGORIES_PER_LOCALITY = 10;

  for (let i = 0; i < batchCount; i++) {
    const chunk = elements.slice(i * CATEGORIES_PER_LOCALITY, (i + 1) * CATEGORIES_PER_LOCALITY);
    if (chunk.length < 7) {
      results.push(createUnavailableProfile("Malformed Overpass response for locality batch element"));
    } else {
      results.push(parseAmenityResponse({ elements: chunk }, fetchedAt));
    }
  }

  return results;
}

/**
 * Parses an envelope response containing nodes/ways with tags and center coordinates,
 * binning elements into per-locality category counts using exact Haversine radius limits.
 */
export function parseEnvelopeAmenityResponse(
  raw: unknown,
  localities: Array<{ id: string; lat: number; lon: number }>,
  fetchedAt?: string
): Map<string, AmenityProfileResult> {
  const resultMap = new Map<string, AmenityProfileResult>();
  if (!raw || typeof raw !== "object") {
    localities.forEach((l) =>
      resultMap.set(l.id, createUnavailableProfile("Empty or invalid envelope response"))
    );
    return resultMap;
  }

  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as {
    elements?: Array<{
      type: string;
      id: number;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  const elements = data.elements || [];

  // Tally counts per locality
  const countsPerLocality = localities.map(() => ({
    health: 0,
    education: 0,
    grocery: 0,
    food: 0,
    leisure: 0,
    bus: 0,
    rail: 0,
    police: 0,
    lit: 0,
    surveillance: 0
  }));

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;

    const tags = el.tags || {};
    const isHealth = tags.amenity && /^(hospital|clinic|pharmacy|doctors)$/.test(tags.amenity);
    const isEdu = tags.amenity && /^(school|college|kindergarten|university)$/.test(tags.amenity);
    const isGrocery = tags.shop && /^(supermarket|convenience|grocery|greengrocer)$/.test(tags.shop);
    const isFood = tags.amenity && /^(restaurant|cafe|fast_food|food_court)$/.test(tags.amenity);
    const isLeisure = tags.leisure && /^(park|garden|fitness_centre|playground)$/.test(tags.leisure);
    const isBus = tags.highway === "bus_stop";
    const isRail = tags.railway && /^(station|subway_entrance)$/.test(tags.railway);
    const isPolice = tags.amenity === "police";
    const isLit = tags.lit === "yes";
    const isSurv = tags.man_made === "surveillance";

    for (let i = 0; i < localities.length; i++) {
      const loc = localities[i];
      const distM = haversineDistanceKm(loc.lat, loc.lon, lat, lon) * 1000;
      const c = countsPerLocality[i];

      if (isHealth && distM <= QUERY_RADII.healthcare) c.health++;
      if (isEdu && distM <= QUERY_RADII.education) c.education++;
      if (isGrocery && distM <= QUERY_RADII.grocery) c.grocery++;
      if (isFood && distM <= QUERY_RADII.food) c.food++;
      if (isLeisure && distM <= QUERY_RADII.leisure) c.leisure++;
      if (isBus && distM <= QUERY_RADII.busStops) c.bus++;
      if (isRail && distM <= QUERY_RADII.railStations) c.rail++;
      if (isPolice && distM <= QUERY_RADII.safetyInfrastructure) c.police++;
      if (isLit && distM <= QUERY_RADII.safetyInfrastructure) c.lit++;
      if (isSurv && distM <= QUERY_RADII.safetyInfrastructure) c.surveillance++;
    }
  }

  for (let i = 0; i < localities.length; i++) {
    const loc = localities[i];
    const c = countsPerLocality[i];
    const syntheticResponse: OverpassCountResponse = {
      elements: [
        { type: "count", id: 0, tags: { total: String(c.health) } },
        { type: "count", id: 1, tags: { total: String(c.education) } },
        { type: "count", id: 2, tags: { total: String(c.grocery) } },
        { type: "count", id: 3, tags: { total: String(c.food) } },
        { type: "count", id: 4, tags: { total: String(c.leisure) } },
        { type: "count", id: 5, tags: { total: String(c.bus) } },
        { type: "count", id: 6, tags: { total: String(c.rail) } },
        { type: "count", id: 7, tags: { total: String(c.police) } },
        { type: "count", id: 8, tags: { total: String(c.lit) } },
        { type: "count", id: 9, tags: { total: String(c.surveillance) } }
      ]
    };
    resultMap.set(loc.id, parseAmenityResponse(syntheticResponse, fetchedAt));
  }

  return resultMap;
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

  /**
   * Fetches amenity profiles for a batch of localities (up to 4 per network request)
   * using combined named-set Overpass count queries. Checks and sets per-locality cache.
   */
  async getBatchProfiles(
    localities: Array<{ id: string; lat: number; lon: number }>,
    signal?: AbortSignal
  ): Promise<Map<string, AmenityProfileResult>> {
    const results = new Map<string, AmenityProfileResult>();
    if (localities.length === 0) return results;

    const uncached: Array<{ id: string; lat: number; lon: number }> = [];

    // Check individual cache first
    for (const loc of localities) {
      const cacheKey = `overpass:amenities:${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
      const cache = (this.http as unknown as { cache?: { get<T>(k: string): Promise<T | null> } }).cache;
      if (cache) {
        const cached = await cache.get<AmenityProfileResult>(cacheKey);
        if (cached) {
          results.set(loc.id, cached);
          continue;
        }
      }
      uncached.push(loc);
    }

    if (uncached.length === 0) {
      return results;
    }

    // Process uncached localities in chunks of 4
    const BATCH_SIZE = 4;
    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const chunk = uncached.slice(i, i + BATCH_SIZE);
      const query = buildBatchAmenityProfileQuery(chunk);

      try {
        const response = await this.http.post<OverpassCountResponse>(
          OVERPASS_MIRRORS_CONFIG,
          "interpreter",
          `data=${encodeURIComponent(query)}`,
          {
            signal,
            queue: this.queue,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...(typeof window === "undefined"
                ? { "User-Agent": "Locus/0.1.0 (https://github.com/AniruddhaK07/Locus)" }
                : {})
            }
          }
        );

        const parsedBatch = parseBatchAmenityResponse(response, chunk.length);
        const cache = (this.http as unknown as { cache?: { set<T>(k: string, v: T, ttl: number): Promise<void> } }).cache;

        for (let j = 0; j < chunk.length; j++) {
          const loc = chunk[j];
          const prof = parsedBatch[j];
          results.set(loc.id, prof);

          if (cache && prof.amenities.healthcare.value !== null) {
            const cacheKey = `overpass:amenities:${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
            await cache.set(cacheKey, prof, CACHE_TTL_AMENITIES_MS);
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw err;
        }
        const message = err instanceof Error ? err.message : String(err);
        for (const loc of chunk) {
          results.set(loc.id, createUnavailableProfile(`Batch Overpass amenity query failed: ${message}`));
        }
      }
    }

    return results;
  }

  /**
   * Evaluates if localities can be fetched via a single spatial envelope query.
   * If the envelope area exceeds maxAreaKm2, returns null to fall back to batch queries.
   */
  async getEnvelopeProfiles(
    localities: Array<{ id: string; lat: number; lon: number }>,
    maxAreaKm2: number = 80,
    signal?: AbortSignal
  ): Promise<Map<string, AmenityProfileResult> | null> {
    if (localities.length === 0) return new Map();

    const { bbox, areaKm2 } = computeLocalitiesBoundingBox(localities, 3.0);
    if (areaKm2 > maxAreaKm2) {
      return null; // Envelope is too large for memory/payload cap
    }

    const query = buildEnvelopeAmenityQuery(bbox);
    try {
      const response = await this.http.post<unknown>(
        OVERPASS_MIRRORS_CONFIG,
        "interpreter",
        `data=${encodeURIComponent(query)}`,
        {
          signal,
          queue: this.queue,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...(typeof window === "undefined"
              ? { "User-Agent": "Locus/0.1.0 (https://github.com/AniruddhaK07/Locus)" }
              : {})
          }
        }
      );

      const parsedMap = parseEnvelopeAmenityResponse(response, localities);
      const cache = (this.http as unknown as { cache?: { set<T>(k: string, v: T, ttl: number): Promise<void> } }).cache;

      if (cache) {
        for (const loc of localities) {
          const prof = parsedMap.get(loc.id);
          if (prof && prof.amenities.healthcare.value !== null) {
            const cacheKey = `overpass:amenities:${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
            await cache.set(cacheKey, prof, CACHE_TTL_AMENITIES_MS);
          }
        }
      }

      return parsedMap;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      return null; // On network failure, let caller fall back to batched server counts
    }
  }
}
