/**
 * Locus Engine — Rent Provider & Tier Band Heuristic
 *
 * Implements RentProvider with UserOverride and CityTierBand estimation.
 * Does NOT scrape listing sites. Never shows a single point value as market rent.
 */

import type { AreaId, Measured } from "../../domain/types";
import { RENT_TIER_BANDS, type RentTierBand } from "../../config";

export interface RentProvider {
  getRentEstimate(
    areaId: AreaId,
    cityName: string,
    relativeRank: number // 0 (most central/dense) to 1 (most distant/sparse)
  ): Measured<{ low: number; high: number }>;

  setUserOverride(areaId: AreaId, rent: number): void;
  getUserOverride(areaId: AreaId): number | undefined;
  clearUserOverride(areaId: AreaId): void;
}

export function resolveRentTier(cityName?: string): RentTierBand {
  const norm = (cityName || "").toLowerCase().trim();

  // Tier 1 Prime: Mumbai, Delhi, Bengaluru
  if (norm.includes("mumbai") || norm.includes("delhi") || norm.includes("bengaluru") || norm.includes("bangalore")) {
    return RENT_TIER_BANDS.tier_1_prime;
  }

  // Tier 1 Standard: Pune, Hyderabad, Chennai
  if (norm.includes("pune") || norm.includes("hyderabad") || norm.includes("chennai")) {
    return RENT_TIER_BANDS.tier_1_standard;
  }

  // Tier 2: Jaipur, Lucknow, Nagpur, Indore
  if (
    norm.includes("jaipur") ||
    norm.includes("lucknow") ||
    norm.includes("nagpur") ||
    norm.includes("indore") ||
    norm.includes("ahmedabad") ||
    norm.includes("surat") ||
    norm.includes("chandigarh")
  ) {
    return RENT_TIER_BANDS.tier_2;
  }

  // Tier 3: Rest of India
  return RENT_TIER_BANDS.tier_3;
}

export class DefaultRentProvider implements RentProvider {
  private overrides: Map<AreaId, number> = new Map();

  setUserOverride(areaId: AreaId, rent: number): void {
    if (rent > 0) {
      this.overrides.set(areaId, rent);
    }
  }

  getUserOverride(areaId: AreaId): number | undefined {
    return this.overrides.get(areaId);
  }

  clearUserOverride(areaId: AreaId): void {
    this.overrides.delete(areaId);
  }

  getRentEstimate(
    areaId: AreaId,
    cityName: string,
    relativeRank: number = 0.5
  ): Measured<{ low: number; high: number }> {
    // 1. Check user override
    const userRent = this.overrides.get(areaId);
    if (userRent !== undefined) {
      return {
        value: { low: userRent, high: userRent },
        source: "user",
        confidence: "high",
        note: "user-entered known rent"
      };
    }

    // 2. City tier band heuristic
    const tier = resolveRentTier(cityName);
    const clampedRank = Math.max(0, Math.min(1, relativeRank));

    // Scaling: central localities (rank near 0) trend higher; outer areas (rank near 1) trend lower
    const span = tier.bandHigh - tier.bandLow;
    // Central position factor: 0.35 to 0.70 of span
    const position = 0.70 - 0.35 * clampedRank;
    const centerRent = tier.bandLow + span * position;

    // Locality band is roughly +/- 20% around the estimated center, floored to 1000s
    const bandWidth = Math.round((span * 0.25) / 1000) * 1000;
    const low = Math.max(tier.bandLow, Math.round((centerRent - bandWidth / 2) / 1000) * 1000);
    const high = Math.min(tier.bandHigh, Math.round((centerRent + bandWidth / 2) / 1000) * 1000);

    return {
      value: { low, high },
      source: "heuristic",
      confidence: "low",
      note: "estimated band, not listing data"
    };
  }
}
