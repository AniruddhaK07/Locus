/**
 * Locus Engine — OSRM Multi-Modal Routing Provider
 *
 * Implements batch table matrix queries (many-to-one) over verified dedicated
 * endpoints on routing.openstreetmap.de (routed-car, routed-bike, routed-foot).
 * Applies honest peak congestion adjustments and isolates transit mode as unverified.
 */

import type { CommuteEstimate, Destination, TransportMode } from "../../domain/types";
import type { BatchTableRequest, LocalityCommuteResult, RoutingProvider } from "./types";
import type { HttpClient } from "../../infra/httpClient";
import { RateLimitQueue } from "../../infra/queue";
import { haversineDistanceKm } from "../../domain/geo";
import { resolveCityAlpha, computePeakCommute, computeEffectiveCommute } from "../../scoring/commute";
import {
  OSRM_ROUTED_HOSTS,
  OSRM_DEMO_HOST,
  OSRM_CONCURRENCY,
  OSRM_MIN_SPACING_MS,
  CACHE_TTL_ROUTING_MS
} from "../../config";

export interface OsrmTableResponse {
  code: string;
  durations: (number | null)[][]; // durations[sourceIdx][destIdx] in seconds
  distances?: (number | null)[][]; // distances[sourceIdx][destIdx] in meters
  message?: string;
}

/**
 * Builds the OSRM table matrix request URL.
 */
export function buildOsrmTableUrl(
  baseHost: string,
  origins: Array<{ lat: number; lon: number }>,
  destinations: Destination[]
): string {
  // Destination coords come first (indices 0 .. D-1)
  // Origin coords follow (indices D .. D + N - 1)
  const destCoords = destinations.map((d) => `${d.lon.toFixed(6)},${d.lat.toFixed(6)}`);
  const originCoords = origins.map((o) => `${o.lon.toFixed(6)},${o.lat.toFixed(6)}`);
  const allCoords = [...destCoords, ...originCoords].join(";");

  const dCount = destinations.length;
  const oCount = origins.length;

  const destIndices = Array.from({ length: dCount }, (_, i) => i).join(";");
  const sourceIndices = Array.from({ length: oCount }, (_, i) => dCount + i).join(";");

  return `${baseHost}/table/v1/driving/${allCoords}?sources=${sourceIndices}&destinations=${destIndices}&annotations=duration,distance`;
}

/**
 * Parses raw OSRM table response into structured LocalityCommuteResults.
 */
export function parseOsrmTableResponse(
  response: OsrmTableResponse,
  origins: Array<{ lat: number; lon: number }>,
  destinations: Destination[],
  mode: TransportMode,
  alpha: number,
  maxCommuteMin?: number
): LocalityCommuteResult[] {
  if (!response || response.code !== "Ok" || !Array.isArray(response.durations)) {
    throw new Error(`OSRM table query failed: ${response?.message || response?.code || "invalid response"}`);
  }

  const results: LocalityCommuteResult[] = [];

  for (let i = 0; i < origins.length; i++) {
    const origin = origins[i];
    const originDurations = response.durations[i] || [];
    const originDistances = response.distances ? response.distances[i] || [] : [];
    const commutes: CommuteEstimate[] = [];

    for (let j = 0; j < destinations.length; j++) {
      const dest = destinations[j];
      const durationSec = originDurations[j];
      const distanceMeters = originDistances[j];

      if (durationSec === null || durationSec === undefined || isNaN(durationSec)) {
        // Destination unreachable by road network
        commutes.push({
          destinationId: dest.id,
          destinationLabel: dest.label,
          freeFlowMin: {
            value: null,
            source: "routing",
            confidence: "none",
            note: "Unreachable by road network"
          },
          peakEstimateMin: {
            value: null,
            source: "heuristic",
            confidence: "none",
            note: "Unreachable by road network"
          },
          distanceKm: {
            value: null,
            source: "routing",
            confidence: "none"
          },
          mode,
          exceedsMax: false
        });
        continue;
      }

      const freeFlowMin = Math.max(1, Math.round(durationSec / 60));
      const distanceKm =
        distanceMeters !== null && distanceMeters !== undefined && !isNaN(distanceMeters)
          ? Math.round((distanceMeters / 1000) * 10) / 10
          : Math.round(haversineDistanceKm(origin.lat, origin.lon, dest.lat, dest.lon) * 1.3 * 10) / 10;

      // Peak congestion heuristic
      const { peakMin, lowRangeMin, highRangeMin } = computePeakCommute(freeFlowMin, distanceKm, alpha);
      const exceedsMax = Boolean(maxCommuteMin && peakMin > maxCommuteMin);

      commutes.push({
        destinationId: dest.id,
        destinationLabel: dest.label,
        freeFlowMin: {
          value: freeFlowMin,
          source: "routing",
          confidence: "medium",
          note: "free-flow routing duration"
        },
        peakEstimateMin: {
          value: peakMin,
          source: "heuristic",
          confidence: "low",
          note: `estimated peak range: ${lowRangeMin}–${highRangeMin}m (α=${alpha})`
        },
        distanceKm: {
          value: distanceKm,
          source: "routing",
          confidence: "high"
        },
        mode,
        exceedsMax
      });
    }

    const effectiveCommuteMin = computeEffectiveCommute(commutes);
    const exceedsMaxOverall = Boolean(
      maxCommuteMin &&
      effectiveCommuteMin.value !== null &&
      effectiveCommuteMin.value > maxCommuteMin
    );

    results.push({
      commutes,
      effectiveCommuteMin,
      exceedsMax: exceedsMaxOverall
    });
  }

  return results;
}

export class OsrmRoutingProvider implements RoutingProvider {
  private queue: RateLimitQueue;

  constructor(
    private http: HttpClient,
    queue?: RateLimitQueue
  ) {
    this.queue =
      queue ??
      new RateLimitQueue({
        concurrency: OSRM_CONCURRENCY,
        minSpacingMs: OSRM_MIN_SPACING_MS
      });
  }

  async calculateCommutes(
    request: BatchTableRequest,
    signal?: AbortSignal
  ): Promise<LocalityCommuteResult[]> {
    const { origins, destinations, mode, cityName, maxCommuteMin } = request;

    // Handle transit mode: unverified in v1
    if (mode === "transit") {
      const unavailableResult: LocalityCommuteResult = {
        commutes: destinations.map((d) => ({
          destinationId: d.id,
          destinationLabel: d.label,
          freeFlowMin: {
            value: null,
            source: "unavailable",
            confidence: "none",
            note: "Transit schedule routing is unverified in v1; public transit GTFS unavailable"
          },
          peakEstimateMin: {
            value: null,
            source: "unavailable",
            confidence: "none",
            note: "Transit schedule routing is unverified in v1"
          },
          distanceKm: {
            value: null,
            source: "unavailable",
            confidence: "none"
          },
          mode: "transit",
          exceedsMax: false
        })),
        effectiveCommuteMin: {
          value: null,
          source: "unavailable",
          confidence: "none",
          note: "Transit mode disabled/unverified in v1"
        },
        exceedsMax: false
      };

      return origins.map(() => unavailableResult);
    }

    // Determine alpha congestion multiplier
    const alpha = request.cityTierAlpha ?? resolveCityAlpha(cityName).alpha;

    // Determine base host per verified endpoints
    const baseHost =
      mode === "car"
        ? OSRM_ROUTED_HOSTS.car
        : mode === "bike"
        ? OSRM_ROUTED_HOSTS.bike
        : OSRM_ROUTED_HOSTS.foot;

    const url = buildOsrmTableUrl(baseHost, origins, destinations);
    const cacheKey = `osrm:table:${mode}:${origins.length}x${destinations.length}:${origins[0]?.lat.toFixed(4)},${origins[0]?.lon.toFixed(4)}`;

    try {
      const response = await this.http.get<OsrmTableResponse>(url, {
        signal,
        cacheKey,
        cacheTtlMs: CACHE_TTL_ROUTING_MS,
        queue: this.queue,
        headers: typeof window === "undefined"
          ? { "User-Agent": "Locus/0.1.0 (https://github.com/AniruddhaK07/Locus)" }
          : undefined
      });

      return parseOsrmTableResponse(response, origins, destinations, mode, alpha, maxCommuteMin);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      // If car mode and openstreetmap.de failed, try demo host fallback
      if (mode === "car") {
        try {
          const fallbackUrl = buildOsrmTableUrl(OSRM_DEMO_HOST, origins, destinations);
          const fallbackResponse = await this.http.get<OsrmTableResponse>(fallbackUrl, {
            signal,
            cacheKey: `fallback:${cacheKey}`,
            cacheTtlMs: CACHE_TTL_ROUTING_MS,
            queue: this.queue
          });
          return parseOsrmTableResponse(fallbackResponse, origins, destinations, mode, alpha, maxCommuteMin);
        } catch {
          // Both primary and fallback failed
        }
      }

      // Return explicit null metrics on failure
      const errorNote = `Routing calculation failed: ${err instanceof Error ? err.message : String(err)}`;
      return origins.map(() => ({
        commutes: destinations.map((d) => ({
          destinationId: d.id,
          destinationLabel: d.label,
          freeFlowMin: { value: null, source: "unavailable", confidence: "none", note: errorNote },
          peakEstimateMin: { value: null, source: "unavailable", confidence: "none", note: errorNote },
          distanceKm: { value: null, source: "unavailable", confidence: "none" },
          mode,
          exceedsMax: false
        })),
        effectiveCommuteMin: { value: null, source: "unavailable", confidence: "none", note: errorNote },
        exceedsMax: false
      }));
    }
  }
}
