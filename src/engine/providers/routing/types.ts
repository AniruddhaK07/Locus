/**
 * Locus Engine — Routing Provider Interfaces
 */

import type { CommuteEstimate, Destination, Measured, TransportMode } from "../../domain/types";

export interface BatchTableRequest {
  origins: Array<{ lat: number; lon: number }>;
  destinations: Destination[];
  mode: TransportMode;
  cityName?: string;
  cityTierAlpha?: number;
  maxCommuteMin?: number;
}

export interface LocalityCommuteResult {
  commutes: CommuteEstimate[];
  effectiveCommuteMin: Measured<number>;
  exceedsMax: boolean;
}

export interface RoutingProvider {
  calculateCommutes(
    request: BatchTableRequest,
    signal?: AbortSignal
  ): Promise<LocalityCommuteResult[]>;
}
