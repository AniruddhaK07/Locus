/**
 * Locus Engine — Safety Infrastructure Indicator
 *
 * Computes safety score strictly from physical OSM infrastructure tags
 * (police stations, lit streets, surveillance nodes).
 * Labeled exactly "infrastructure indicator, not crime data".
 * Does NOT use artificial baseline constants (e.g. "5.0 + ...") and never derives from amenities.
 */

import type { Measured } from "../domain/types";
import type { LocalitySafetyCounts } from "../providers/amenities/types";

export function computeSafetyIndicator(safetyDetails: LocalitySafetyCounts): Measured<number> {
  const police = safetyDetails.policeCount.value ?? 0;
  const litRoads = safetyDetails.litRoadsCount.value ?? 0;
  const surveillance = safetyDetails.surveillanceCount.value ?? 0;

  const totalSafetyTags = police + litRoads + surveillance;

  // Thin coverage check: return null if zero infrastructure elements are mapped
  if (totalSafetyTags === 0) {
    return {
      value: null,
      source: "unavailable",
      confidence: "none",
      note: "insufficient OSM safety infrastructure tags (infrastructure indicator, not crime data)"
    };
  }

  // Pure infrastructure density score (0–10)
  // HEURISTIC weights: police station = 2.5 pts, 12.5 lit ways = 1 pt (0.08), surveillance = 0.5 pt
  const rawScore = police * 2.5 + litRoads * 0.08 + surveillance * 0.5;
  const score = Math.round(Math.min(10.0, rawScore) * 10) / 10;

  let confidence: "high" | "medium" | "low" = "medium";
  if (totalSafetyTags < 5) {
    confidence = "low";
  } else if (totalSafetyTags >= 25) {
    confidence = "high";
  }

  return {
    value: score,
    source: "osm",
    confidence,
    note: "infrastructure indicator, not crime data"
  };
}
