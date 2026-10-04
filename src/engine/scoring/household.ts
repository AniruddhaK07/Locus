/**
 * Locus Engine — Household Fit Scoring
 *
 * Derives fit score (0–10) deterministically from relative category scores
 * according to household persona preferences:
 * - family: education (40%), leisure/parks (30%), healthcare (30%)
 * - couple: food & dining (50%), leisure (50%)
 * - student: education (40%), transit access (35%), food (25%)
 * - balanced: equal weighting across all available categories
 */

import type { HouseholdType, Measured } from "../domain/types";
import type { NormalizedLocalityScores } from "./amenityScores";

export function computeHouseholdFit(
  householdType: HouseholdType,
  scores: NormalizedLocalityScores
): Measured<number> {
  const getCat = (key: keyof NormalizedLocalityScores["categoryScores"]): number | null => {
    return scores.categoryScores[key]?.value ?? null;
  };

  const edu = getCat("education");
  const leisure = getCat("leisure");
  const health = getCat("healthcare");
  const food = getCat("food");
  const transit = scores.transitAccessScore.value;

  const blend = (weights: Array<{ val: number | null; w: number }>): number | null => {
    let sum = 0;
    let totalW = 0;
    for (const item of weights) {
      if (item.val !== null) {
        sum += item.val * item.w;
        totalW += item.w;
      }
    }
    return totalW > 0 ? Math.round((sum / totalW) * 10) / 10 : null;
  };

  let fitVal: number | null = null;
  let formulaDesc = "";

  switch (householdType) {
    case "family":
      fitVal = blend([
        { val: edu, w: 0.40 },
        { val: leisure, w: 0.30 },
        { val: health, w: 0.30 }
      ]);
      formulaDesc = "schools (40%), parks/leisure (30%), healthcare (30%)";
      break;

    case "couple":
      fitVal = blend([
        { val: food, w: 0.50 },
        { val: leisure, w: 0.50 }
      ]);
      formulaDesc = "dining/cafes (50%), leisure/entertainment (50%)";
      break;

    case "student":
      fitVal = blend([
        { val: edu, w: 0.40 },
        { val: transit, w: 0.35 },
        { val: food, w: 0.25 }
      ]);
      formulaDesc = "education (40%), transit access (35%), dining (25%)";
      break;

    case "balanced":
    default:
      fitVal = blend([
        { val: edu, w: 0.20 },
        { val: leisure, w: 0.20 },
        { val: health, w: 0.20 },
        { val: food, w: 0.20 },
        { val: transit, w: 0.20 }
      ]);
      formulaDesc = "balanced blend across education, leisure, health, food, transit";
      break;
  }

  if (fitVal === null) {
    return {
      value: null,
      source: "unavailable",
      confidence: "none",
      note: "Insufficient amenity data for household fit evaluation"
    };
  }

  return {
    value: fitVal,
    source: "heuristic",
    confidence: "medium",
    note: `derived from ${formulaDesc}`
  };
}
