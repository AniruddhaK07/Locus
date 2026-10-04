/**
 * Locus Engine — Explanation Generator
 *
 * Template-based plain English explanations built directly from measured components
 * and their provenance. No LLM calls, zero hallucinations.
 *
 * Generates:
 * 1. Single summary explanation: e.g. "28 min by car at peak (estimate) · strong grocery and healthcare access · rent band is an estimate"
 * 2. Exactly 3 keyFacts: bite-sized highlights covering commute, lifestyle/fit, and rent/caveats.
 */

import type { Measured, Preferences } from "../domain/types";

export interface ExplanationInput {
  areaName: string;
  preferences: Preferences;
  effectiveCommute: Measured<number>;
  rentBand: Measured<{ low: number; high: number }>;
  safetyIndicator: Measured<number>;
  amenitiesScore: Measured<number>;
  householdFit?: Measured<number>;
  transitAccess?: Measured<number>;
  exceedsMaxCommute?: boolean;
}

export interface ExplanationResult {
  explanation: string;
  keyFacts: [string, string, string]; // Exactly 3 key highlights
}

export function generateExplanations(input: ExplanationInput): ExplanationResult {
  const {
    preferences,
    effectiveCommute,
    rentBand,
    safetyIndicator,
    amenitiesScore,
    householdFit,
    exceedsMaxCommute = false
  } = input;

  // 1. Commute Highlight
  let commuteSummary = "";
  let commuteFact = "";
  const mode = preferences.transportMode;
  const modeLabel = mode === "car" ? "car" : mode === "bike" ? "bike" : mode === "walk" ? "walk" : "transit";

  if (effectiveCommute.value !== null) {
    const mins = Math.round(effectiveCommute.value);
    const estTag = effectiveCommute.source === "heuristic" ? " (estimate)" : "";

    if (exceedsMaxCommute) {
      commuteSummary = `${mins} min by ${modeLabel} at peak${estTag} (exceeds max ${preferences.maxCommuteMin}m)`;
      commuteFact = `Exceeds max commute (${mins}m peak by ${modeLabel})`;
    } else {
      commuteSummary = `${mins} min by ${modeLabel} at peak${estTag}`;
      commuteFact = `${mins}m peak ${modeLabel} to ${preferences.workplace.label || "work"}`;
    }
  } else {
    commuteSummary = `Commute unavailable (${effectiveCommute.note ?? "unrouted"})`;
    commuteFact = "Commute duration unverified";
  }

  // 2. Lifestyle / Amenity Highlight
  let amenitySummary = "";
  let amenityFact = "";

  if (amenitiesScore.value !== null) {
    const score = amenitiesScore.value;
    if (score >= 7.5) {
      amenitySummary = "strong local daily-needs & grocery access";
      amenityFact = "High amenity & daily-needs density";
    } else if (score >= 4.5) {
      amenitySummary = "moderate amenity access";
      amenityFact = "Moderate neighborhood amenity access";
    } else {
      amenitySummary = "developing commercial & daily amenities";
      amenityFact = "Limited commercial amenities in radius";
    }
  } else {
    amenitySummary = "amenities unprofiled";
    amenityFact = "Amenity data unprofiled";
  }

  if (householdFit?.value !== null && householdFit?.value !== undefined && householdFit.value >= 7.0) {
    amenityFact = `Strong ${preferences.householdType} persona fit (${householdFit.value.toFixed(1)}/10)`;
  }

  // 3. Rent & Data Caveats
  let caveatSummary = "";
  let rentFact = "";

  if (rentBand.value !== null) {
    const { low, high } = rentBand.value;
    if (rentBand.source === "user") {
      caveatSummary = "known rent entered by user";
      rentFact = `₹${low.toLocaleString("en-IN")}/mo (user-entered rent)`;
    } else {
      caveatSummary = "rent band is an estimate";
      rentFact = `₹${(low / 1000).toFixed(0)}k–${(high / 1000).toFixed(0)}k/mo (tier band estimate)`;
    }
  } else {
    caveatSummary = "rent data unavailable";
    rentFact = "Rent data unavailable";
  }

  // Mention missing/low-confidence inputs if critical
  if (safetyIndicator.value === null || safetyIndicator.confidence === "none") {
    caveatSummary += " · sparse OSM safety infrastructure";
  } else if (safetyIndicator.confidence === "low") {
    caveatSummary += " · low safety data coverage";
  }

  // Compose cohesive 3-part sentence
  const explanation = `${commuteSummary} · ${amenitySummary} · ${caveatSummary}`;

  // If third fact can mention safety caveat when rent is already covered
  if (safetyIndicator.value === null && rentBand.source === "user") {
    rentFact = "Sparse OSM safety data (infra indicator)";
  }

  return {
    explanation,
    keyFacts: [commuteFact, amenityFact, rentFact]
  };
}
