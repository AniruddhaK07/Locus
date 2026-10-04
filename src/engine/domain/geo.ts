/**
 * Locus Engine — Geographic & Locality Utilities
 *
 * Implements Haversine distance calculations, name normalization,
 * spatial deduplication, and anchor-relative candidate ranking.
 */

import type { AreaId } from "./types";

export interface LocalityCandidate {
  id: AreaId;
  name: string;
  osmType: "node" | "way" | "relation";
  osmId: number;
  lat: number;
  lon: number;
  distanceToAnchorKm?: number;
}

/**
 * Calculates great-circle distance between two points in kilometres
 * using the Haversine formula.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Normalizes locality name for comparison:
 * lowercase, removes common punctuation and administrative suffixes.
 */
export function normalizeLocalityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(ward|layout|extension|extn|block|stage|phase|sector|nagar|colony)\b/g, "")
    .trim();
}

/**
 * Deduplicates localities having the same normalized name and located within
 * a close spatial threshold (< proximityKm, default 0.5 km = 500m).
 *
 * Priority order when duplicates exist: relation > way > node.
 */
export function deduplicateLocalities(
  candidates: LocalityCandidate[],
  proximityKm: number = 0.5
): LocalityCandidate[] {
  const typePriority: Record<"relation" | "way" | "node", number> = {
    relation: 3,
    way: 2,
    node: 1
  };

  const results: LocalityCandidate[] = [];

  for (const candidate of candidates) {
    const norm = normalizeLocalityName(candidate.name);
    if (!norm) continue;

    // Check if we already have an element with same/close normalized name within proximity
    const existingIndex = results.findIndex((existing) => {
      const existingNorm = normalizeLocalityName(existing.name);
      if (existingNorm !== norm && !existingNorm.includes(norm) && !norm.includes(existingNorm)) {
        return false;
      }
      const dist = haversineDistanceKm(
        existing.lat,
        existing.lon,
        candidate.lat,
        candidate.lon
      );
      return dist <= proximityKm;
    });

    if (existingIndex === -1) {
      results.push(candidate);
    } else {
      // Keep higher priority geometry (relation > way > node)
      const existing = results[existingIndex];
      if (typePriority[candidate.osmType] > typePriority[existing.osmType]) {
        results[existingIndex] = candidate;
      }
    }
  }

  return results;
}

export interface RankOptions {
  limit?: number;
  offset?: number;
  maxCommuteMin?: number;
  maxSpeedKmhCeiling?: number; // Generous ceiling for pre-filtering (default 80 km/h)
}

/**
 * Ranks candidates by great-circle distance to the primary anchor (workplace),
 * pre-filters candidates that cannot meet max commute even in fastest mode,
 * and slices to the requested window [offset, offset + limit].
 */
export function rankAndSelectLocalities(
  candidates: LocalityCandidate[],
  anchor: { lat: number; lon: number },
  options: RankOptions = {}
): { selected: LocalityCandidate[]; totalCandidates: number } {
  const {
    limit = 12,
    offset = 0,
    maxCommuteMin,
    maxSpeedKmhCeiling = 80 // HEURISTIC: theoretical upper speed ceiling
  } = options;

  // 1. Compute distance to anchor for all candidates
  const withDistance = candidates.map((c) => ({
    ...c,
    distanceToAnchorKm: haversineDistanceKm(anchor.lat, anchor.lon, c.lat, c.lon)
  }));

  // 2. Pre-filter by maximum conceivable distance if maxCommuteMin is specified
  let filtered = withDistance;
  if (maxCommuteMin && maxCommuteMin > 0) {
    const maxPossibleDistanceKm = (maxCommuteMin / 60) * maxSpeedKmhCeiling;
    const withinBudget = withDistance.filter(
      (c) => (c.distanceToAnchorKm ?? 0) <= maxPossibleDistanceKm
    );
    // Only apply filter if it doesn't starve the candidate list below limit
    if (withinBudget.length >= limit) {
      filtered = withinBudget;
    }
  }

  // 3. Sort by distance to anchor ascending (closest first)
  filtered.sort((a, b) => (a.distanceToAnchorKm ?? 0) - (b.distanceToAnchorKm ?? 0));

  const totalCandidates = filtered.length;
  const selected = filtered.slice(offset, offset + limit);

  return { selected, totalCandidates };
}
