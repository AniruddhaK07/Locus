/**
 * Locus Engine — Locality Provider Interfaces
 */

import type { AreaId } from "../../domain/types";
import type { CityResolutionResult } from "../geocoding/types";

export interface DiscoveredLocality {
  id: AreaId;
  name: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lon: number;
  distanceToAnchorKm?: number;
}

export interface LocalityDiscoveryOptions {
  limit?: number;
  offset?: number;
  maxCommuteMin?: number;
}

export interface LocalityDiscoveryResult {
  localities: DiscoveredLocality[];
  totalCandidates: number;
  sourceNote: string;
}

export interface LocalityProvider {
  discoverLocalities(
    resolution: CityResolutionResult,
    anchor: { lat: number; lon: number },
    options?: LocalityDiscoveryOptions,
    signal?: AbortSignal
  ): Promise<LocalityDiscoveryResult>;
}
