/**
 * Locus Engine — Multi-Criteria Match Scoring
 *
 * Implements §4.4 scoring algorithm:
 * - Prior weights (budget 28, commute 27, safety 18, amenities 12, transit 8, household 7)
 * - Missing or weak data reduces influence instead of defaulting:
 *   effectiveWeight = baseWeight * confidenceFactor
 * - Renormalizes over non-null criteria so final score spans 0–100
 * - Explicit null checks and `??` (never `value || default`)
 * - Computes dataCompleteness as share of base weights backed by real data
 */

import type { Confidence, Measured, Preferences, ScoreCriterion } from "../domain/types";
import { BASE_WEIGHTS, CONFIDENCE_FACTORS, COMMUTE_EXP_K, PRIORITY_FOCUS_BOOST } from "../config";
import { computeBudgetUtility } from "./budget";
import { generateExplanations, type ExplanationResult } from "./explanations";

export interface ScoreAreaInput {
  areaName: string;
  preferences: Preferences;
  effectiveCommute: Measured<number>;
  rentBand: Measured<{ low: number; high: number }>;
  safetyIndicator: Measured<number>;
  amenitiesScore: Measured<number>;
  transitAccessScore: Measured<number>;
  householdFit: Measured<number>;
  exceedsMaxCommute?: boolean;
}

export interface ScoreAreaOutput {
  matchScore: number;
  confidence: Confidence;
  dataCompleteness: number;
  scoreBreakdown: ScoreCriterion[];
  explanation: string;
  keyFacts: string[];
}

export function computeCommuteUtility(commuteMinutes: number, maxMinutes: number): number {
  if (commuteMinutes <= 0) {
    return 1.0;
  }
  const tMax = maxMinutes > 0 ? maxMinutes : 60;
  return Math.max(0, Math.min(1, Math.exp(-COMMUTE_EXP_K * (commuteMinutes / tMax))));
}

export function scoreArea(input: ScoreAreaInput): ScoreAreaOutput {
  const {
    areaName,
    preferences,
    effectiveCommute,
    rentBand,
    safetyIndicator,
    amenitiesScore,
    transitAccessScore,
    householdFit,
    exceedsMaxCommute = false
  } = input;

  // 1. Establish base weights with optional priority focus boost
  const rawBaseWeights: Record<string, number> = {
    budget: BASE_WEIGHTS.budget,
    commute: BASE_WEIGHTS.commute,
    safety: BASE_WEIGHTS.safety,
    amenities: BASE_WEIGHTS.amenities,
    transit: BASE_WEIGHTS.transit,
    household: BASE_WEIGHTS.household
  };

  if (preferences.priorityFocus && rawBaseWeights[preferences.priorityFocus] !== undefined) {
    rawBaseWeights[preferences.priorityFocus] *= PRIORITY_FOCUS_BOOST;
  }

  // 2. Define criteria descriptors with raw utility and confidence
  interface CriterionDescriptor {
    name: "budget" | "commute" | "safety" | "amenities" | "transit" | "household";
    baseWeight: number;
    raw: Measured<unknown>;
    utility: number | null;
  }

  // Compute utilities strictly with null checks (never fallback to default)
  const budgetUtility: number | null =
    rentBand.value !== null
      ? computeBudgetUtility(
          Math.round((rentBand.value.low + rentBand.value.high) / 2),
          preferences.budgetMax,
          preferences.budgetMin
        )
      : null;

  const commuteUtility: number | null =
    effectiveCommute.value !== null
      ? computeCommuteUtility(effectiveCommute.value, preferences.maxCommuteMin)
      : null;

  const safetyUtility: number | null =
    safetyIndicator.value !== null
      ? Math.max(0, Math.min(1, safetyIndicator.value / 10.0))
      : null;

  const amenitiesUtility: number | null =
    amenitiesScore.value !== null
      ? Math.max(0, Math.min(1, amenitiesScore.value / 10.0))
      : null;

  const transitUtility: number | null =
    transitAccessScore.value !== null
      ? Math.max(0, Math.min(1, transitAccessScore.value / 10.0))
      : null;

  const householdUtility: number | null =
    householdFit.value !== null
      ? Math.max(0, Math.min(1, householdFit.value / 10.0))
      : null;

  const criteria: CriterionDescriptor[] = [
    {
      name: "budget",
      baseWeight: rawBaseWeights.budget,
      raw: rentBand,
      utility: budgetUtility
    },
    {
      name: "commute",
      baseWeight: rawBaseWeights.commute,
      raw: effectiveCommute,
      utility: commuteUtility
    },
    {
      name: "safety",
      baseWeight: rawBaseWeights.safety,
      raw: safetyIndicator,
      utility: safetyUtility
    },
    {
      name: "amenities",
      baseWeight: rawBaseWeights.amenities,
      raw: amenitiesScore,
      utility: amenitiesUtility
    },
    {
      name: "transit",
      baseWeight: rawBaseWeights.transit,
      raw: transitAccessScore,
      utility: transitUtility
    },
    {
      name: "household",
      baseWeight: rawBaseWeights.household,
      raw: householdFit,
      utility: householdUtility
    }
  ];

  // 3. Compute effective weights and dataCompleteness
  let totalBaseWeight = 0;
  let backedBaseWeight = 0;
  let totalEffectiveWeight = 0;

  const intermediate = criteria.map((crit) => {
    totalBaseWeight += crit.baseWeight;
    const isPresent = crit.raw.value !== null && crit.utility !== null;

    if (isPresent) {
      backedBaseWeight += crit.baseWeight;
    }

    const confFactor = isPresent
      ? (CONFIDENCE_FACTORS[crit.raw.confidence] ?? 0.35)
      : 0.0;

    const effectiveWeight = crit.baseWeight * confFactor;
    totalEffectiveWeight += effectiveWeight;

    return {
      crit,
      isPresent,
      effectiveWeight
    };
  });

  const dataCompleteness =
    totalBaseWeight > 0
      ? Math.round((backedBaseWeight / totalBaseWeight) * 100) / 100
      : 0;

  // 4. Renormalize across criteria with non-null backing data
  let totalPoints = 0;
  const scoreBreakdown: ScoreCriterion[] = intermediate.map(({ crit, isPresent, effectiveWeight }) => {
    if (!isPresent || totalEffectiveWeight <= 0) {
      return {
        name: crit.name,
        points: 0,
        maxPoints: 0,
        effectiveWeight: Math.round(effectiveWeight * 10) / 10,
        raw: crit.raw
      };
    }

    const normalizedWeight = effectiveWeight / totalEffectiveWeight;
    const maxPoints = Math.round(normalizedWeight * 100 * 10) / 10;
    const points = Math.round(maxPoints * (crit.utility ?? 0) * 10) / 10;

    totalPoints += points;

    return {
      name: crit.name,
      points,
      maxPoints,
      effectiveWeight: Math.round(effectiveWeight * 10) / 10,
      raw: crit.raw
    };
  });

  const matchScore = Math.min(100, Math.max(0, Math.round(totalPoints)));

  // 5. Determine overall locality confidence
  let overallConfidence: Confidence = "low";
  if (dataCompleteness >= 0.8 && effectiveCommute.confidence !== "low") {
    overallConfidence = "high";
  } else if (dataCompleteness >= 0.5) {
    overallConfidence = "medium";
  } else if (dataCompleteness === 0) {
    overallConfidence = "none";
  }

  // 6. Generate template explanations and 3 key facts
  const explanationResult: ExplanationResult = generateExplanations({
    areaName,
    preferences,
    effectiveCommute,
    rentBand,
    safetyIndicator,
    amenitiesScore,
    householdFit,
    transitAccess: transitAccessScore,
    exceedsMaxCommute
  });

  return {
    matchScore,
    confidence: overallConfidence,
    dataCompleteness,
    scoreBreakdown,
    explanation: explanationResult.explanation,
    keyFacts: explanationResult.keyFacts
  };
}
