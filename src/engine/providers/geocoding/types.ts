/**
 * Locus Engine — Geocoding Provider Interfaces
 */

import type { PlaceSuggestion } from "../../domain/types";

export interface CityResolutionResult {
  name: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lon: number;
  relationId?: number;
  enclosingAreaId?: number;
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
  sourceNote?: string;
}

export interface GeocodingProvider {
  suggest(query: string, hint?: { city?: string }, signal?: AbortSignal): Promise<PlaceSuggestion[]>;
  resolveCity(cityName: string, signal?: AbortSignal): Promise<CityResolutionResult>;
}
