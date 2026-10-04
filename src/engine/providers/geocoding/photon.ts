/**
 * Locus Engine — Photon Geocoding Provider
 *
 * Implements typeahead place suggestions querying Komoot Photon API.
 * Uses HttpClient with polite spacing and response caching.
 */

import type { PlaceSuggestion } from "../../domain/types";
import type { HttpClient } from "../../infra/httpClient";
import { PHOTON_BASE_URL, CACHE_TTL_GEOCODING_MS } from "../../config";

interface PhotonFeatureProperties {
  osm_type?: string;
  osm_id?: number;
  osm_key?: string;
  osm_value?: string;
  name?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  country?: string;
  type?: string;
}

interface PhotonFeature {
  type: string;
  properties: PhotonFeatureProperties;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
}

interface PhotonResponse {
  type: string;
  features?: PhotonFeature[];
}

function mapOsmType(code?: string): "node" | "way" | "relation" {
  if (!code) return "node";
  const upper = code.toUpperCase();
  if (upper === "W" || upper === "WAY") return "way";
  if (upper === "R" || upper === "RELATION") return "relation";
  return "node";
}

/**
 * Pure parser for Photon GeoJSON response.
 * Handles both raw FeatureCollection or fixture wrappers containing `{ data: FeatureCollection }`.
 */
export function parsePhotonResponse(raw: unknown): PlaceSuggestion[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const collection = (root.data && typeof root.data === "object" ? root.data : root) as PhotonResponse;

  if (!Array.isArray(collection.features)) return [];

  return collection.features
    .filter((f) => f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 2)
    .map((f) => {
      const p = f.properties || {};
      const [lon, lat] = f.geometry.coordinates;
      const osmType = mapOsmType(p.osm_type);
      const osmId = p.osm_id ?? Math.floor(Math.random() * 1000000);
      const name = p.name || p.district || p.city || "Unnamed location";

      return {
        id: `${osmType}/${osmId}`,
        name,
        city: p.city || p.county,
        district: p.district,
        state: p.state,
        lat,
        lon,
        type: p.type || p.osm_value || "locality"
      };
    });
}

export class PhotonGeocodingProvider {
  constructor(private http: HttpClient) {}

  async suggest(query: string, hint?: { city?: string }, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    let searchTerms = trimmed;
    if (hint?.city && !trimmed.toLowerCase().includes(hint.city.toLowerCase())) {
      searchTerms = `${trimmed} ${hint.city}`;
    }

    const url = `${PHOTON_BASE_URL}/?q=${encodeURIComponent(searchTerms)}&limit=5`;
    const response = await this.http.get<PhotonResponse>(url, {
      signal,
      cacheTtlMs: CACHE_TTL_GEOCODING_MS
    });

    return parsePhotonResponse(response);
  }
}
