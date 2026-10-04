/**
 * Locus Engine — Amenity Provider Types
 */

import type { AmenityCounts, Measured } from "../../domain/types";

export interface LocalitySafetyCounts {
  policeCount: Measured<number>;
  litRoadsCount: Measured<number>;
  surveillanceCount: Measured<number>;
  coverageNote: string;
}

export interface AmenityProfileResult {
  amenities: AmenityCounts;
  safety: LocalitySafetyCounts;
  totalMappedObjects: number;
}

export interface AmenityProvider {
  getProfile(
    coords: { lat: number; lon: number },
    signal?: AbortSignal
  ): Promise<AmenityProfileResult>;
}
