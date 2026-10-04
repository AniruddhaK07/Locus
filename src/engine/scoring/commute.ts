/**
 * Locus Engine — Commute Peak Adjustment & Blending Calculations
 *
 * Implements city tier resolution, peak congestion heuristic, multi-destination
 * weighting (0.7 primary + 0.3 extras), and commute utility decay.
 */

import type { CommuteEstimate, Measured } from "../domain/types";
import {
  CITY_TIER_ALPHAS,
  PRIMARY_COMMUTE_WEIGHT,
  EXTRAS_COMMUTE_WEIGHT,
  COMMUTE_EXP_K
} from "../config";

export interface CityAlphaResolution {
  tier: "Tier 1 Mega-Metro" | "Tier 1 Dense Metro" | "Tier 2 Large Metro" | "Tier 3 Standard";
  alpha: number;
  matchedOn: string;
}

/**
 * Resolves the congestion multiplier alpha from normalized geocoder fields.
 * Never relies on raw user input text.
 */
export function resolveCityAlpha(cityName?: string, districtName?: string): CityAlphaResolution {
  const normCity = (cityName || "").toLowerCase().trim();
  const normDistrict = (districtName || "").toLowerCase().trim();

  // Tier 1 Mega-Metro (alpha = 2.3)
  const megaMetros = ["bengaluru", "bangalore", "mumbai", "delhi", "new delhi"];
  for (const m of megaMetros) {
    if (normCity.includes(m) || normDistrict.includes(m)) {
      return { tier: "Tier 1 Mega-Metro", alpha: CITY_TIER_ALPHAS[m] ?? 2.3, matchedOn: m };
    }
  }

  // Tier 1 Dense Metro (alpha = 1.9)
  const denseMetros = ["kolkata", "chennai", "hyderabad"];
  for (const m of denseMetros) {
    if (normCity.includes(m) || normDistrict.includes(m)) {
      return { tier: "Tier 1 Dense Metro", alpha: CITY_TIER_ALPHAS[m] ?? 1.9, matchedOn: m };
    }
  }

  // Tier 2 Large Metro (alpha = 1.6)
  const largeMetros = ["pune", "ahmedabad"];
  for (const m of largeMetros) {
    if (normCity.includes(m) || normDistrict.includes(m)) {
      return { tier: "Tier 2 Large Metro", alpha: CITY_TIER_ALPHAS[m] ?? 1.6, matchedOn: m };
    }
  }

  // Fallback to default (alpha = 1.2)
  return {
    tier: "Tier 3 Standard",
    alpha: CITY_TIER_ALPHAS.default ?? 1.2,
    matchedOn: "default fallback"
  };
}

export interface PeakCommuteRange {
  peakMin: number;
  lowRangeMin: number;
  highRangeMin: number;
}

/**
 * Computes peak commute estimate using the honest heuristic:
 * T_peak = T_freeflow * (1 + alpha_city * (1 - exp(-d / 8)))
 */
export function computePeakCommute(
  freeFlowMin: number,
  distanceKm: number,
  alpha: number
): PeakCommuteRange {
  if (freeFlowMin <= 0 || distanceKm <= 0) {
    return {
      peakMin: Math.max(1, Math.round(freeFlowMin)),
      lowRangeMin: Math.max(1, Math.round(freeFlowMin)),
      highRangeMin: Math.max(1, Math.round(freeFlowMin))
    };
  }

  // HEURISTIC: T_peak = T_freeflow * (1 + alpha * (1 - exp(-d / 8)))
  const distanceFactor = 1 - Math.exp(-distanceKm / 8);
  const multiplier = 1 + alpha * distanceFactor;
  const peakMin = Math.round(freeFlowMin * multiplier);

  // Range band: 0.9x to 1.15x
  const lowRangeMin = Math.max(Math.round(freeFlowMin), Math.round(peakMin * 0.9));
  const highRangeMin = Math.round(peakMin * 1.15);

  return { peakMin, lowRangeMin, highRangeMin };
}

/**
 * Blends multiple destinations into a single effective commute:
 * 0.7 * primary + 0.3 * mean(extras) when extras exist.
 */
export function computeEffectiveCommute(commutes: CommuteEstimate[]): Measured<number> {
  if (!commutes || commutes.length === 0) {
    return {
      value: null,
      source: "unavailable",
      confidence: "none",
      note: "No commute destinations evaluated"
    };
  }

  const primary = commutes[0];
  if (primary.peakEstimateMin.value === null) {
    return {
      value: null,
      source: "unavailable",
      confidence: "none",
      note: primary.peakEstimateMin.note || "Primary destination commute unavailable"
    };
  }

  const primaryVal = primary.peakEstimateMin.value;

  if (commutes.length === 1) {
    return {
      value: primaryVal,
      source: "heuristic",
      confidence: "low",
      note: primary.peakEstimateMin.note
    };
  }

  // Multiple destinations
  const extras = commutes.slice(1);
  const validExtras = extras
    .map((e) => e.peakEstimateMin.value)
    .filter((v): v is number => v !== null);

  if (validExtras.length === 0) {
    return {
      value: primaryVal,
      source: "heuristic",
      confidence: "low",
      note: `${primary.peakEstimateMin.note} (extra destinations unavailable)`
    };
  }

  const extrasMean = validExtras.reduce((sum, v) => sum + v, 0) / validExtras.length;
  const effective = Math.round(
    PRIMARY_COMMUTE_WEIGHT * primaryVal + EXTRAS_COMMUTE_WEIGHT * extrasMean
  );

  return {
    value: effective,
    source: "heuristic",
    confidence: "low",
    note: `Blended: 70% ${primary.destinationLabel} (${primaryVal}m) + 30% extras (${Math.round(extrasMean)}m)`
  };
}

/**
 * Calculates commute score (0–100) using exponential decay:
 * S = 100 * exp(-k * t / tMax)
 */
export function computeCommuteScore(
  effectiveCommuteMin: number | null,
  maxCommuteMin: number
): number | null {
  if (effectiveCommuteMin === null || maxCommuteMin <= 0) return null;
  const ratio = effectiveCommuteMin / maxCommuteMin;
  const score = 100 * Math.exp(-COMMUTE_EXP_K * ratio);
  return Math.round(Math.min(100, Math.max(0, score)));
}
