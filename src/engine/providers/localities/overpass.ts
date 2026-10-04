/**
 * Locus Engine — Overpass Locality Provider
 *
 * Discovers candidate localities (suburbs, neighbourhoods, quarters) within
 * a city administrative area or exact bounding box.
 * Extracts centroids for nodes, ways, and relations, generates stable IDs,
 * deduplicates by normalized name + proximity, and ranks by distance to anchor.
 */

import type { LocalityCandidate } from "../../domain/geo";
import { deduplicateLocalities, rankAndSelectLocalities } from "../../domain/geo";
import type { CityResolutionResult } from "../geocoding/types";
import type {
  DiscoveredLocality,
  LocalityDiscoveryOptions,
  LocalityDiscoveryResult,
  LocalityProvider
} from "./types";
import type { HttpClient, MirrorConfig } from "../../infra/httpClient";
import { RateLimitQueue } from "../../infra/queue";
import {
  OVERPASS_MIRRORS,
  OVERPASS_CONCURRENCY,
  OVERPASS_MIN_SPACING_MS,
  CACHE_TTL_LOCALITIES_MS,
  DEFAULT_CANDIDATE_LIMIT
} from "../../config";

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements?: OverpassElement[];
  sampleElements?: OverpassElement[]; // For probe fixture compatibility
}

export const OVERPASS_MIRRORS_CONFIG: MirrorConfig = {
  name: "overpass",
  urls: OVERPASS_MIRRORS
};

/**
 * Builds the Overpass QL query string for locality discovery.
 */
export function buildOverpassLocalityQuery(resolution: CityResolutionResult): string {
  if (resolution.relationId) {
    const areaId = 3600000000 + resolution.relationId;
    return `[out:json][timeout:25];
area(${areaId})->.searchArea;
(
  nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.searchArea);
);
out center;`;
  }

  if (resolution.enclosingAreaId) {
    return `[out:json][timeout:25];
area(${resolution.enclosingAreaId})->.searchArea;
(
  nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.searchArea);
);
out center;`;
  }

  if (resolution.boundingBox) {
    const [south, north, west, east] = resolution.boundingBox;
    return `[out:json][timeout:25];
(
  nwr["place"~"^(suburb|neighbourhood|quarter)$"](${south},${west},${north},${east});
);
out center;`;
  }

  throw new Error(`Cannot build Overpass locality query: resolution has no relationId, enclosingAreaId, or boundingBox`);
}

/**
 * Pure parser for Overpass locality discovery responses.
 * Extracts centroids (lat ?? center.lat), drops unnamed items, and generates stable IDs.
 */
export function parseOverpassLocalities(raw: unknown): LocalityCandidate[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as OverpassResponse;

  const elements = data.elements || data.sampleElements;
  if (!Array.isArray(elements)) return [];

  const candidates: LocalityCandidate[] = [];

  for (const el of elements) {
    const name = el.tags?.name?.trim();
    if (!name) continue; // Drop unnamed elements

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined || isNaN(lat) || isNaN(lon)) {
      continue;
    }

    candidates.push({
      id: `${el.type}/${el.id}`,
      name,
      osmType: el.type,
      osmId: el.id,
      lat,
      lon
    });
  }

  return candidates;
}

export class OverpassLocalityProvider implements LocalityProvider {
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

  async discoverLocalities(
    resolution: CityResolutionResult,
    anchor: { lat: number; lon: number },
    options?: LocalityDiscoveryOptions,
    signal?: AbortSignal
  ): Promise<LocalityDiscoveryResult> {
    const query = buildOverpassLocalityQuery(resolution);
    const cacheKey = `overpass:localities:${resolution.relationId ?? resolution.enclosingAreaId ?? resolution.boundingBox?.join(",")}`;

    const rawResponse = await this.http.post<OverpassResponse>(
      OVERPASS_MIRRORS_CONFIG,
      "interpreter",
      `data=${encodeURIComponent(query)}`,
      {
        signal,
        cacheKey,
        cacheTtlMs: CACHE_TTL_LOCALITIES_MS,
        queue: this.queue,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(typeof window === "undefined"
            ? { "User-Agent": "Locus/0.1.0 (https://github.com/AniruddhaK07/Locus)" }
            : {})
        }
      }
    );

    const parsedCandidates = parseOverpassLocalities(rawResponse);
    const deduped = deduplicateLocalities(parsedCandidates, 0.5);

    const limit = options?.limit ?? DEFAULT_CANDIDATE_LIMIT;
    const offset = options?.offset ?? 0;
    const maxCommuteMin = options?.maxCommuteMin;

    const { selected, totalCandidates } = rankAndSelectLocalities(deduped, anchor, {
      limit,
      offset,
      maxCommuteMin
    });

    const localities: DiscoveredLocality[] = selected.map((c) => ({
      id: c.id,
      name: c.name,
      osmType: c.osmType,
      osmId: c.osmId,
      lat: c.lat,
      lon: c.lon,
      distanceToAnchorKm: c.distanceToAnchorKm
    }));

    return {
      localities,
      totalCandidates,
      sourceNote: resolution.sourceNote || `Discovered via Overpass`
    };
  }
}
