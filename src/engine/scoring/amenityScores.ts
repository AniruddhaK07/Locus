/**
 * Locus Engine — Amenity Normalization & Scoring
 *
 * Implements relative normalization (log1p then min-max) across the candidate set,
 * with heuristic reference fallbacks when fewer than 5 candidates exist.
 */

import type { AmenityCounts, Measured } from "../domain/types";

export type AmenityCategory =
  | "healthcare"
  | "education"
  | "grocery"
  | "food"
  | "leisure"
  | "busStops"
  | "railStations";

// Documented reference saturation ceilings when candidate count < 5 (HEURISTIC)
export const ABSOLUTE_REFERENCE_CEILINGS: Record<AmenityCategory, number> = {
  grocery: 15,
  food: 40,
  healthcare: 15,
  education: 15,
  leisure: 15,
  busStops: 20,
  railStations: 3
};

// Intra-amenity category weights for overall amenities score (sum = 1.0) (HEURISTIC)
export const AMENITY_CATEGORY_WEIGHTS: Record<
  "healthcare" | "education" | "grocery" | "food" | "leisure",
  number
> = {
  grocery: 0.25,
  food: 0.25,
  healthcare: 0.20,
  education: 0.15,
  leisure: 0.15
};

export interface NormalizedLocalityScores {
  categoryScores: Record<AmenityCategory, Measured<number>>;
  amenitiesScore: Measured<number>; // 0–10
  transitAccessScore: Measured<number>; // 0–10
}

/**
 * Normalizes amenity counts across all candidate localities in the search.
 * Returns normalized 0–10 scores for each locality.
 */
export function normalizeAmenityProfiles(
  localityAmenities: AmenityCounts[]
): NormalizedLocalityScores[] {
  const categories: AmenityCategory[] = [
    "healthcare",
    "education",
    "grocery",
    "food",
    "leisure",
    "busStops",
    "railStations"
  ];

  // 1. Gather valid counts per category
  const categoryValues: Record<AmenityCategory, (number | null)[]> = {
    healthcare: [],
    education: [],
    grocery: [],
    food: [],
    leisure: [],
    busStops: [],
    railStations: []
  };

  for (const item of localityAmenities) {
    for (const cat of categories) {
      categoryValues[cat].push(item[cat]?.value ?? null);
    }
  }

  // 2. Compute min/max log1p per category
  const categoryRanges: Record<
    AmenityCategory,
    { min: number; max: number; validCount: number }
  > = {
    healthcare: { min: 0, max: 0, validCount: 0 },
    education: { min: 0, max: 0, validCount: 0 },
    grocery: { min: 0, max: 0, validCount: 0 },
    food: { min: 0, max: 0, validCount: 0 },
    leisure: { min: 0, max: 0, validCount: 0 },
    busStops: { min: 0, max: 0, validCount: 0 },
    railStations: { min: 0, max: 0, validCount: 0 }
  };

  for (const cat of categories) {
    const valid = categoryValues[cat].filter((v): v is number => v !== null);
    if (valid.length > 0) {
      const logs = valid.map((v) => Math.log1p(v));
      categoryRanges[cat] = {
        min: Math.min(...logs),
        max: Math.max(...logs),
        validCount: valid.length
      };
    }
  }

  // 3. Score each locality
  return localityAmenities.map((item) => {
    const scores: Partial<Record<AmenityCategory, Measured<number>>> = {};

    for (const cat of categories) {
      const raw = item[cat];
      if (!raw || raw.value === null) {
        scores[cat] = {
          value: null,
          source: raw?.source || "unavailable",
          confidence: raw?.confidence || "none",
          note: raw?.note || "Data unavailable"
        };
        continue;
      }

      const rawVal = raw.value;
      const logVal = Math.log1p(rawVal);
      const range = categoryRanges[cat];
      let score: number;

      if (range.validCount >= 5) {
        // Relative normalization across candidates
        if (range.max === range.min) {
          score = 5.0;
        } else {
          score = (10 * (logVal - range.min)) / (range.max - range.min);
        }
      } else {
        // Fallback to absolute heuristic reference ceiling
        const refCeiling = ABSOLUTE_REFERENCE_CEILINGS[cat];
        const refLog = Math.log1p(refCeiling);
        score = 10 * Math.min(1.0, logVal / refLog);
      }

      scores[cat] = {
        value: Math.round(score * 10) / 10,
        source: raw.source,
        confidence: raw.confidence,
        note: range.validCount >= 5 ? "relative to search candidates" : "calibrated to reference ceiling"
      };
    }

    // Compute blended Amenities Score (0–10)
    const amenityCats: ("healthcare" | "education" | "grocery" | "food" | "leisure")[] = [
      "grocery",
      "food",
      "healthcare",
      "education",
      "leisure"
    ];

    let amenityWeightedSum = 0;
    let amenityWeightTotal = 0;
    let worstAmenityConfidence: "high" | "medium" | "low" = "high";

    for (const cat of amenityCats) {
      const s = scores[cat];
      if (s && s.value !== null) {
        const w = AMENITY_CATEGORY_WEIGHTS[cat];
        amenityWeightedSum += s.value * w;
        amenityWeightTotal += w;
        if (s.confidence === "low") worstAmenityConfidence = "low";
        else if (s.confidence === "medium" && worstAmenityConfidence !== "low") {
          worstAmenityConfidence = "medium";
        }
      }
    }

    const amenitiesScore: Measured<number> =
      amenityWeightTotal > 0
        ? {
            value: Math.round((amenityWeightedSum / amenityWeightTotal) * 10) / 10,
            source: "heuristic",
            confidence: worstAmenityConfidence,
            note: "blended relative amenity profile"
          }
        : {
            value: null,
            source: "unavailable",
            confidence: "none",
            note: "No amenity category data available"
          };

    // Compute Transit Access Score (0–10)
    const busScore = scores.busStops;
    const railScore = scores.railStations;
    let transitSum = 0;
    let transitWeight = 0;

    if (busScore && busScore.value !== null) {
      transitSum += busScore.value * 0.4;
      transitWeight += 0.4;
    }
    if (railScore && railScore.value !== null) {
      transitSum += railScore.value * 0.6;
      transitWeight += 0.6;
    }

    const transitAccessScore: Measured<number> =
      transitWeight > 0
        ? {
            value: Math.round((transitSum / transitWeight) * 10) / 10,
            source: "heuristic",
            confidence: busScore?.confidence === "low" || railScore?.confidence === "low" ? "low" : "medium",
            note: "derived from bus stops (500m) and rail/metro stations (1500m)"
          }
        : {
            value: null,
            source: "unavailable",
            confidence: "none",
            note: "No transit data available"
          };

    return {
      categoryScores: scores as Record<AmenityCategory, Measured<number>>,
      amenitiesScore,
      transitAccessScore
    };
  });
}
