/**
 * Locus Engine — Locality Comparison & Winner Evaluation
 *
 * Implements §4.8 comparison:
 * - Builds side-by-side metric rows for 2 or more localities.
 * - Evaluates per-metric winners deterministically (highest match, lowest commute, etc.).
 * - Gracefully handles missing values and ties (no arbitrary tie-breaking).
 */

import type { AreaDetail, AreaId, ComparisonMetricRow, ComparisonResult } from "../domain/types";

export function compareAreas(areas: AreaDetail[]): ComparisonResult {
  if (areas.length === 0) {
    return { areas: [], rows: [] };
  }

  // Helper to find winner id
  function findWinner<T>(
    items: AreaDetail[],
    getVal: (d: AreaDetail) => T | null,
    compareFn: (a: T, b: T) => number
  ): AreaId | undefined {
    let bestVal: T | null = null;
    let bestId: AreaId | undefined = undefined;
    let isTie = false;

    for (const d of items) {
      const val = getVal(d);
      if (val === null) continue;

      if (bestVal === null) {
        bestVal = val;
        bestId = d.id;
        isTie = false;
      } else {
        const diff = compareFn(val, bestVal);
        if (diff > 0) {
          // Better
          bestVal = val;
          bestId = d.id;
          isTie = false;
        } else if (diff === 0) {
          isTie = true;
        }
      }
    }

    return isTie ? undefined : bestId;
  }

  // 1. Match Score Row
  const matchRow: ComparisonMetricRow = {
    metric: "matchScore",
    label: "Match Score",
    values: Object.fromEntries(
      areas.map((d) => [
        d.id,
        {
          value: `${d.matchScore}/100`,
          source: "heuristic" as const,
          confidence: d.confidence
        }
      ])
    ),
    winnerId: findWinner(areas, (d) => d.matchScore, (a, b) => a - b)
  };

  // 2. Peak Commute Row (lower is better)
  const commuteRow: ComparisonMetricRow = {
    metric: "commute",
    label: "Peak Commute",
    values: Object.fromEntries(
      areas.map((d) => [
        d.id,
        {
          value: d.effectiveCommuteMin.value !== null ? `${d.effectiveCommuteMin.value} min` : "Unavailable",
          source: d.effectiveCommuteMin.source,
          confidence: d.effectiveCommuteMin.confidence,
          note: d.effectiveCommuteMin.note
        }
      ])
    ),
    winnerId: findWinner(
      areas,
      (d) => d.effectiveCommuteMin.value,
      (a, b) => b - a // lower is better
    )
  };

  // 3. Rent Row (lower is better)
  const rentRow: ComparisonMetricRow = {
    metric: "rent",
    label: "Rent Band (₹/mo)",
    values: Object.fromEntries(
      areas.map((d) => {
        let displayVal = "Unavailable";
        if (d.userRentOverride) {
          displayVal = `₹${d.userRentOverride.toLocaleString("en-IN")} (user)`;
        } else if (d.rentBand.value !== null) {
          displayVal = `₹${d.rentBand.value.low.toLocaleString("en-IN")} - ₹${d.rentBand.value.high.toLocaleString("en-IN")}`;
        }
        return [
          d.id,
          {
            value: displayVal,
            source: d.userRentOverride ? ("user" as const) : d.rentBand.source,
            confidence: d.userRentOverride ? ("high" as const) : d.rentBand.confidence,
            note: d.rentBand.note
          }
        ];
      })
    ),
    winnerId: findWinner(
      areas,
      (d) => {
        if (d.userRentOverride) return d.userRentOverride;
        if (d.rentBand.value !== null) {
          return (d.rentBand.value.low + d.rentBand.value.high) / 2;
        }
        return null;
      },
      (a, b) => b - a // lower is better
    )
  };

  // 4. Amenities Rating Row (higher is better)
  const amenitiesRow: ComparisonMetricRow = {
    metric: "amenities",
    label: "Amenities Rating",
    values: Object.fromEntries(
      areas.map((d) => [
        d.id,
        {
          value: d.amenitiesScore.value !== null ? `${d.amenitiesScore.value} / 10` : "Sparse",
          source: d.amenitiesScore.source,
          confidence: d.amenitiesScore.confidence,
          note: d.amenitiesScore.note
        }
      ])
    ),
    winnerId: findWinner(
      areas,
      (d) => d.amenitiesScore.value,
      (a, b) => a - b
    )
  };

  // 5. Safety Infrastructure Row (higher is better)
  const safetyRow: ComparisonMetricRow = {
    metric: "safety",
    label: "Safety Infrastructure",
    values: Object.fromEntries(
      areas.map((d) => [
        d.id,
        {
          value: d.safetyIndicator.value !== null ? `${d.safetyIndicator.value} / 10` : "Sparse tags",
          source: d.safetyIndicator.source,
          confidence: d.safetyIndicator.confidence,
          note: d.safetyIndicator.note
        }
      ])
    ),
    winnerId: findWinner(
      areas,
      (d) => d.safetyIndicator.value,
      (a, b) => a - b
    )
  };

  // 6. Data Completeness Row (higher is better)
  const completenessRow: ComparisonMetricRow = {
    metric: "completeness",
    label: "Data Completeness",
    values: Object.fromEntries(
      areas.map((d) => [
        d.id,
        {
          value: `${Math.round(d.dataCompleteness * 100)}%`,
          source: "heuristic" as const,
          confidence: "high" as const
        }
      ])
    ),
    winnerId: findWinner(
      areas,
      (d) => d.dataCompleteness,
      (a, b) => a - b
    )
  };

  return {
    areas,
    rows: [matchRow, commuteRow, rentRow, amenitiesRow, safetyRow, completenessRow]
  };
}
