/**
 * Locus Engine — Nominatim Geocoding Provider
 *
 * Implements on-submit city resolution, identifying administrative relations
 * or falling back to exact geocoder bounding boxes with zero padding.
 */

import type { CityResolutionResult } from "./types";
import type { HttpClient } from "../../infra/httpClient";
import { NOMINATIM_BASE_URL, CACHE_TTL_GEOCODING_MS } from "../../config";

export interface NominatimRawItem {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  addresstype?: string;
  name: string;
  display_name: string;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
  address?: Record<string, string>;
  extratags?: Record<string, string>;
  importance?: number;
}

/**
 * Pure parser for Nominatim search responses.
 * Finds the best administrative relation or falls back to node/way with exact bounding box.
 */
export function parseNominatimCityResponse(raw: unknown): CityResolutionResult | null {
  if (!raw) return null;
  const root = raw as Record<string, unknown>;
  const items = (Array.isArray(root) ? root : root.data) as NominatimRawItem[];

  if (!Array.isArray(items) || items.length === 0) return null;

  // 1. If primary match is already a relation, use it
  if (items[0].osm_type === "relation") {
    const item = items[0];
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const boundingBox = item.boundingbox
      ? (item.boundingbox.map((v) => parseFloat(v)) as [number, number, number, number])
      : undefined;

    return {
      name: item.name,
      osmType: "relation",
      osmId: item.osm_id,
      relationId: item.osm_id,
      lat,
      lon,
      boundingBox,
      sourceNote: `Resolved to OSM administrative relation ${item.osm_id}`
    };
  }

  // 2. Look for a relation explicitly representing the city (addresstype: "city" or type: "city")
  const cityRelation = items.find(
    (item) =>
      item.osm_type === "relation" &&
      (item.addresstype === "city" || item.type === "city" || (item.category === "boundary" && item.addresstype === "municipality"))
  );

  if (cityRelation) {
    const lat = parseFloat(cityRelation.lat);
    const lon = parseFloat(cityRelation.lon);
    const boundingBox = cityRelation.boundingbox
      ? (cityRelation.boundingbox.map((v) => parseFloat(v)) as [number, number, number, number])
      : undefined;

    return {
      name: cityRelation.name,
      osmType: "relation",
      osmId: cityRelation.osm_id,
      relationId: cityRelation.osm_id,
      lat,
      lon,
      boundingBox,
      sourceNote: `Resolved to OSM administrative relation ${cityRelation.osm_id}`
    };
  }

  // 3. Fallback: Top node or way (e.g. Pune) with exact geocoder bounding box
  const topItem = items[0];
  const lat = parseFloat(topItem.lat);
  const lon = parseFloat(topItem.lon);
  const boundingBox = topItem.boundingbox
    ? (topItem.boundingbox.map((v) => parseFloat(v)) as [number, number, number, number])
    : undefined;

  return {
    name: topItem.name,
    osmType: topItem.osm_type,
    osmId: topItem.osm_id,
    lat,
    lon,
    boundingBox,
    sourceNote: `No administrative relation found; fell back to geocoder bounding box with no padding`
  };
}

export class NominatimGeocodingProvider {
  constructor(
    private http: HttpClient,
    private geoContact?: string
  ) {}

  async resolveCity(cityName: string, signal?: AbortSignal): Promise<CityResolutionResult> {
    const trimmed = cityName.trim();
    if (!trimmed) {
      throw new Error("City name cannot be empty");
    }

    const query = trimmed.toLowerCase().includes("india") ? trimmed : `${trimmed}, India`;
    let url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&extratags=1`;
    if (this.geoContact) {
      url += `&email=${encodeURIComponent(this.geoContact)}`;
    }

    const headers: Record<string, string> = {};
    if (typeof window === "undefined") {
      headers["User-Agent"] = "Locus/0.1.0 (https://github.com/AniruddhaK07/Locus)";
    }

    const response = await this.http.get<NominatimRawItem[]>(url, {
      signal,
      headers,
      cacheTtlMs: CACHE_TTL_GEOCODING_MS
    });

    const parsed = parseNominatimCityResponse(response);
    if (!parsed) {
      throw new Error(`Unable to resolve city: "${cityName}"`);
    }

    return parsed;
  }
}
