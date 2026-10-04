import { describe, it, expect } from "vitest";
import {
  computeBudgetUtility,
  computeSafetyIndicator,
  computeHouseholdFit,
  computeCommuteUtility,
  scoreArea,
  generateExplanations,
  resolveRentTier,
  DefaultRentProvider,
  type Preferences
} from "../src/engine";
import type { LocalitySafetyCounts } from "../src/engine/providers/amenities/types";
import type { NormalizedLocalityScores } from "../src/engine/scoring/amenityScores";

describe("Phase 6: Scoring Engine & Explanations", () => {
  describe("Budget Utility Function (§4.4 Property Tests)", () => {
    const Rmin = 20000;
    const Rmax = 50000;
    const Rt = Rmin + 0.75 * (Rmax - Rmin); // 42500

    it("evaluates to 1.0 for rent between Rmin and Rt", () => {
      expect(computeBudgetUtility(Rmin, Rmax, Rmin)).toBe(1.0);
      expect(computeBudgetUtility(Rt, Rmax, Rmin)).toBe(1.0);
      expect(computeBudgetUtility((Rmin + Rt) / 2, Rmax, Rmin)).toBe(1.0);
    });

    it("satisfies continuity at Rmin", () => {
      const eps = 0.01;
      const justBelow = computeBudgetUtility(Rmin - eps, Rmax, Rmin);
      const atRmin = computeBudgetUtility(Rmin, Rmax, Rmin);
      const justAbove = computeBudgetUtility(Rmin + eps, Rmax, Rmin);

      expect(Math.abs(justBelow - atRmin)).toBeLessThan(0.001);
      expect(Math.abs(justAbove - atRmin)).toBeLessThan(0.001);
    });

    it("satisfies continuity at Rt", () => {
      const eps = 0.01;
      const justBelow = computeBudgetUtility(Rt - eps, Rmax, Rmin);
      const atRt = computeBudgetUtility(Rt, Rmax, Rmin);
      const justAbove = computeBudgetUtility(Rt + eps, Rmax, Rmin);

      expect(Math.abs(justBelow - atRt)).toBeLessThan(0.001);
      expect(Math.abs(justAbove - atRt)).toBeLessThan(0.001);
    });

    it("satisfies continuity at Rmax", () => {
      const eps = 0.01;
      const justBelow = computeBudgetUtility(Rmax - eps, Rmax, Rmin);
      const atRmax = computeBudgetUtility(Rmax, Rmax, Rmin);
      const justAbove = computeBudgetUtility(Rmax + eps, Rmax, Rmin);

      // At Rmax, linear regime ends at 0.7, exponential starts at 0.7
      expect(atRmax).toBeCloseTo(0.7, 5);
      expect(Math.abs(justBelow - atRmax)).toBeLessThan(0.001);
      expect(Math.abs(justAbove - atRmax)).toBeLessThan(0.001);
    });

    it("is strictly non-increasing (monotone decreasing) for R > Rt", () => {
      let prevU = computeBudgetUtility(Rt, Rmax, Rmin);
      for (let r = Rt + 500; r <= 3 * Rmax; r += 500) {
        const u = computeBudgetUtility(r, Rmax, Rmin);
        expect(u).toBeLessThanOrEqual(prevU);
        prevU = u;
      }
    });

    it("guarantees rent just under Rmax scores strictly higher than rent just over Rmax", () => {
      const eps = 10;
      const under = computeBudgetUtility(Rmax - eps, Rmax, Rmin);
      const over = computeBudgetUtility(Rmax + eps, Rmax, Rmin);
      expect(under).toBeGreaterThan(over);
    });

    it("bounds utility strictly in [0, 1] across extreme values", () => {
      expect(computeBudgetUtility(0, Rmax, Rmin)).toBeGreaterThanOrEqual(0.7);
      expect(computeBudgetUtility(10_000, Rmax, Rmin)).toBeGreaterThanOrEqual(0.7);
      expect(computeBudgetUtility(1_000_000, Rmax, Rmin)).toBeGreaterThanOrEqual(0);
      expect(computeBudgetUtility(1_000_000, Rmax, Rmin)).toBeLessThanOrEqual(1.0);
      expect(computeBudgetUtility(-5000, Rmax, Rmin)).toBe(0);
    });

    it("defaults Rmin to 0.4 * Rmax when omitted", () => {
      const uDefault = computeBudgetUtility(0.4 * Rmax, Rmax);
      expect(uDefault).toBe(1.0);
    });
  });

  describe("Safety Infrastructure Indicator (§4.4)", () => {
    it("returns null with 'unavailable' when zero infrastructure elements are mapped", () => {
      const counts: LocalitySafetyCounts = {
        policeCount: { value: 0, source: "osm", confidence: "medium" },
        litRoadsCount: { value: 0, source: "osm", confidence: "medium" },
        surveillanceCount: { value: 0, source: "osm", confidence: "medium" },
        coverageNote: "insufficient tags"
      };

      const result = computeSafetyIndicator(counts);
      expect(result.value).toBeNull();
      expect(result.source).toBe("unavailable");
      expect(result.confidence).toBe("none");
      expect(result.note).toContain("infrastructure indicator, not crime data");
    });

    it("returns low confidence when fewer than 5 tags exist", () => {
      const counts: LocalitySafetyCounts = {
        policeCount: { value: 1, source: "osm", confidence: "medium" },
        litRoadsCount: { value: 2, source: "osm", confidence: "medium" },
        surveillanceCount: { value: 0, source: "osm", confidence: "medium" },
        coverageNote: "sparse infrastructure"
      };

      const result = computeSafetyIndicator(counts);
      expect(result.value).toBeGreaterThan(0);
      expect(result.confidence).toBe("low");
      expect(result.note).toBe("infrastructure indicator, not crime data");
    });

    it("returns high confidence when 25 or more tags exist", () => {
      const counts: LocalitySafetyCounts = {
        policeCount: { value: 2, source: "osm", confidence: "high" },
        litRoadsCount: { value: 30, source: "osm", confidence: "high" },
        surveillanceCount: { value: 10, source: "osm", confidence: "high" },
        coverageNote: "robust infrastructure"
      };

      const result = computeSafetyIndicator(counts);
      expect(result.confidence).toBe("high");
      expect(result.value).toBeLessThanOrEqual(10.0);
    });
  });

  describe("Household Fit Scoring (§4.4)", () => {
    const mockScores: NormalizedLocalityScores = {
      categoryScores: {
        healthcare: { value: 8.0, source: "osm", confidence: "high" },
        education: { value: 9.0, source: "osm", confidence: "high" },
        grocery: { value: 7.0, source: "osm", confidence: "high" },
        food: { value: 6.0, source: "osm", confidence: "high" },
        leisure: { value: 8.5, source: "osm", confidence: "high" },
        busStops: { value: 5.0, source: "osm", confidence: "high" },
        railStations: { value: 4.0, source: "osm", confidence: "high" }
      },
      amenitiesScore: { value: 7.8, source: "osm", confidence: "high" },
      transitAccessScore: { value: 5.0, source: "osm", confidence: "high" }
    };

    it("weights schools (40%), leisure (30%), healthcare (30%) for family persona", () => {
      const fit = computeHouseholdFit("family", mockScores);
      // 9.0 * 0.4 + 8.5 * 0.3 + 8.0 * 0.3 = 3.6 + 2.55 + 2.4 = 8.55 -> 8.6
      expect(fit.value).toBeCloseTo(8.6, 1);
      expect(fit.note).toContain("schools (40%)");
    });

    it("weights dining (50%) and leisure (50%) for couple persona", () => {
      const fit = computeHouseholdFit("couple", mockScores);
      // 6.0 * 0.5 + 8.5 * 0.5 = 7.25 -> 7.3
      expect(fit.value).toBeCloseTo(7.3, 1);
      expect(fit.note).toContain("dining/cafes (50%)");
    });

    it("weights education (40%), transit (35%), food (25%) for student persona", () => {
      const fit = computeHouseholdFit("student", mockScores);
      // 9.0 * 0.4 + 5.0 * 0.35 + 6.0 * 0.25 = 3.6 + 1.75 + 1.5 = 6.85 -> 6.9
      expect(fit.value).toBeCloseTo(6.9, 1);
    });

    it("handles missing categories without defaulting to 0", () => {
      const sparseScores: NormalizedLocalityScores = {
        categoryScores: {
          healthcare: { value: null, source: "unavailable", confidence: "none" },
          education: { value: 8.0, source: "osm", confidence: "high" },
          grocery: { value: null, source: "unavailable", confidence: "none" },
          food: { value: null, source: "unavailable", confidence: "none" },
          leisure: { value: 6.0, source: "osm", confidence: "high" },
          busStops: { value: null, source: "unavailable", confidence: "none" },
          railStations: { value: null, source: "unavailable", confidence: "none" }
        },
        amenitiesScore: { value: 7.0, source: "osm", confidence: "high" },
        transitAccessScore: { value: null, source: "unavailable", confidence: "none" }
      };

      const fit = computeHouseholdFit("family", sparseScores);
      // Family has edu (0.4) and leisure (0.3), healthcare is null.
      // Blends 8.0 * 0.4 + 6.0 * 0.3 / (0.4 + 0.3) = (3.2 + 1.8) / 0.7 = 5.0 / 0.7 = 7.14 -> 7.1
      expect(fit.value).toBeCloseTo(7.1, 1);
    });
  });

  describe("Commute Utility Function (§4.4)", () => {
    it("returns 1.0 for 0 commute minutes", () => {
      expect(computeCommuteUtility(0, 45)).toBe(1.0);
    });

    it("returns exp(-1) ≈ 0.368 when commute equals maxMinutes", () => {
      expect(computeCommuteUtility(45, 45)).toBeCloseTo(Math.exp(-1), 3);
    });

    it("decays monotonically as commute increases past maxMinutes", () => {
      const atMax = computeCommuteUtility(45, 45);
      const overMax = computeCommuteUtility(60, 45);
      const farOver = computeCommuteUtility(90, 45);

      expect(overMax).toBeLessThan(atMax);
      expect(farOver).toBeLessThan(overMax);
    });
  });

  describe("Multi-Criteria Match Scoring & Renormalization (§4.4)", () => {
    const defaultPrefs: Preferences = {
      city: "Bengaluru",
      workplace: { id: "p1", label: "Work", name: "Manyata", lat: 13.04, lon: 77.62 },
      destinations: [],
      transportMode: "car",
      maxCommuteMin: 45,
      budgetMin: 25000,
      budgetMax: 50000,
      householdType: "family"
    };

    it("scores a locality with full backing data across all 6 criteria", () => {
      const result = scoreArea({
        areaName: "Koramangala",
        preferences: defaultPrefs,
        effectiveCommute: { value: 25, source: "routing", confidence: "high" },
        rentBand: { value: { low: 30000, high: 45000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 7.5, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 8.8, source: "osm", confidence: "high" },
        transitAccessScore: { value: 6.0, source: "osm", confidence: "medium" },
        householdFit: { value: 8.2, source: "heuristic", confidence: "medium" }
      });

      expect(result.matchScore).toBeGreaterThan(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
      expect(result.dataCompleteness).toBe(1.0);
      expect(result.scoreBreakdown).toHaveLength(6);
      expect(result.keyFacts).toHaveLength(3);
    });

    it("renormalizes weights and lowers completeness when safety and transit are null", () => {
      const result = scoreArea({
        areaName: "Outer Layout",
        preferences: defaultPrefs,
        effectiveCommute: { value: 30, source: "routing", confidence: "high" },
        rentBand: { value: { low: 20000, high: 30000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: null, source: "unavailable", confidence: "none" },
        amenitiesScore: { value: 6.5, source: "osm", confidence: "high" },
        transitAccessScore: { value: null, source: "unavailable", confidence: "none" },
        householdFit: { value: 7.0, source: "heuristic", confidence: "medium" }
      });

      // Budget (28), Commute (27), Amenities (12), Household (7) = 74/100
      expect(result.dataCompleteness).toBe(0.74);

      // Null criteria must have points = 0 and maxPoints = 0
      const safetyCrit = result.scoreBreakdown.find((c) => c.name === "safety");
      const transitCrit = result.scoreBreakdown.find((c) => c.name === "transit");
      expect(safetyCrit?.maxPoints).toBe(0);
      expect(safetyCrit?.points).toBe(0);
      expect(transitCrit?.maxPoints).toBe(0);
      expect(transitCrit?.points).toBe(0);

      // Remaining criteria maxPoints should sum to ~100
      const totalMaxPoints = result.scoreBreakdown.reduce((sum, c) => sum + c.maxPoints, 0);
      expect(totalMaxPoints).toBeCloseTo(100, 0);
    });

    it("distinguishes real zero from null (never default || 0)", () => {
      const zeroResult = scoreArea({
        areaName: "Zero Amenity Area",
        preferences: defaultPrefs,
        effectiveCommute: { value: 20, source: "routing", confidence: "high" },
        rentBand: { value: { low: 30000, high: 40000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 5.0, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 0, source: "osm", confidence: "medium" }, // REAL ZERO
        transitAccessScore: { value: 5.0, source: "osm", confidence: "medium" },
        householdFit: { value: 5.0, source: "heuristic", confidence: "medium" }
      });

      const nullResult = scoreArea({
        areaName: "Unprofiled Area",
        preferences: defaultPrefs,
        effectiveCommute: { value: 20, source: "routing", confidence: "high" },
        rentBand: { value: { low: 30000, high: 40000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 5.0, source: "osm", confidence: "medium" },
        amenitiesScore: { value: null, source: "unavailable", confidence: "none" }, // NULL
        transitAccessScore: { value: 5.0, source: "osm", confidence: "medium" },
        householdFit: { value: 5.0, source: "heuristic", confidence: "medium" }
      });

      // Real zero has maxPoints > 0 and counts toward completeness
      const zeroAmenity = zeroResult.scoreBreakdown.find((c) => c.name === "amenities");
      expect(zeroAmenity?.maxPoints).toBeGreaterThan(0);
      expect(zeroAmenity?.points).toBe(0);
      expect(zeroResult.dataCompleteness).toBe(1.0);

      // Null has maxPoints = 0 and is excluded from completeness
      const nullAmenity = nullResult.scoreBreakdown.find((c) => c.name === "amenities");
      expect(nullAmenity?.maxPoints).toBe(0);
      expect(nullAmenity?.points).toBe(0);
      expect(nullResult.dataCompleteness).toBeLessThan(1.0);
    });

    it("applies priority focus multiplier correctly", () => {
      const prefsWithCommuteFocus: Preferences = {
        ...defaultPrefs,
        priorityFocus: "commute"
      };

      const standardResult = scoreArea({
        areaName: "Standard",
        preferences: defaultPrefs,
        effectiveCommute: { value: 15, source: "routing", confidence: "high" },
        rentBand: { value: { low: 35000, high: 45000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 7.0, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 7.0, source: "osm", confidence: "high" },
        transitAccessScore: { value: 7.0, source: "osm", confidence: "medium" },
        householdFit: { value: 7.0, source: "heuristic", confidence: "medium" }
      });

      const boostedResult = scoreArea({
        areaName: "Boosted",
        preferences: prefsWithCommuteFocus,
        effectiveCommute: { value: 15, source: "routing", confidence: "high" },
        rentBand: { value: { low: 35000, high: 45000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 7.0, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 7.0, source: "osm", confidence: "high" },
        transitAccessScore: { value: 7.0, source: "osm", confidence: "medium" },
        householdFit: { value: 7.0, source: "heuristic", confidence: "medium" }
      });

      const stdCommute = standardResult.scoreBreakdown.find((c) => c.name === "commute")!;
      const bstCommute = boostedResult.scoreBreakdown.find((c) => c.name === "commute")!;

      expect(bstCommute.effectiveWeight).toBeGreaterThan(stdCommute.effectiveWeight);
      expect(bstCommute.maxPoints).toBeGreaterThan(stdCommute.maxPoints);
    });
  });

  describe("RentProvider & Tier Bands (§4.4)", () => {
    it("resolves cities to appropriate tier bands", () => {
      expect(resolveRentTier("Bengaluru").tierName).toBe("Tier 1 Prime");
      expect(resolveRentTier("Delhi").tierName).toBe("Tier 1 Prime");
      expect(resolveRentTier("Pune").tierName).toBe("Tier 1 Standard");
      expect(resolveRentTier("Jaipur").tierName).toBe("Tier 2");
      expect(resolveRentTier("Mysuru").tierName).toBe("Tier 3");
    });

    it("scales tier band based on candidate rank (central vs peripheral)", () => {
      const provider = new DefaultRentProvider();
      const central = provider.getRentEstimate("node/1", "Bengaluru", 0.0);
      const peripheral = provider.getRentEstimate("node/2", "Bengaluru", 1.0);

      expect(central.value!.high).toBeGreaterThan(peripheral.value!.high);
      expect(central.confidence).toBe("low");
      expect(central.note).toBe("estimated band, not listing data");
    });

    it("prioritizes user override over heuristic tier band", () => {
      const provider = new DefaultRentProvider();
      provider.setUserOverride("node/100", 35000);

      const estimate = provider.getRentEstimate("node/100", "Bengaluru", 0.5);
      expect(estimate.value).toEqual({ low: 35000, high: 35000 });
      expect(estimate.source).toBe("user");
      expect(estimate.confidence).toBe("high");
      expect(estimate.note).toContain("user-entered");
    });
  });

  describe("Explanation Generator (§4.5)", () => {
    it("generates honest plain-English explanation and exactly 3 key facts", () => {
      const prefs: Preferences = {
        city: "Bengaluru",
        workplace: { id: "p1", label: "Office", name: "Embassy GolfLinks", lat: 12.95, lon: 77.64 },
        destinations: [],
        transportMode: "car",
        maxCommuteMin: 40,
        budgetMax: 60000,
        householdType: "couple"
      };

      const result = generateExplanations({
        areaName: "Indiranagar",
        preferences: prefs,
        effectiveCommute: { value: 22, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 35000, high: 55000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 6.8, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 8.5, source: "osm", confidence: "high" },
        householdFit: { value: 8.0, source: "heuristic", confidence: "medium" }
      });

      expect(result.explanation).toContain("22 min by car at peak (estimate)");
      expect(result.explanation).toContain("rent band is an estimate");
      expect(result.keyFacts).toHaveLength(3);
      expect(result.keyFacts[0]).toContain("22m peak car to Office");
      expect(result.keyFacts[2]).toContain("tier band estimate");
    });
  });

  describe("Zero-Fabrication & Strict Null Handling Guard (§4.4)", () => {
    it("prohibits '.value || <default>' patterns in scoring modules", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      const scoringFiles = [
        "src/engine/scoring/matchScore.ts",
        "src/engine/scoring/budget.ts",
        "src/engine/scoring/safety.ts",
        "src/engine/scoring/household.ts"
      ];

      for (const relPath of scoringFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        const content = fs.readFileSync(fullPath, "utf-8");

        // Disallow '.value ||' which treats real 0 as falsy and substitutes a default
        expect(content).not.toMatch(/\.value\s*\|\|/);
      }
    });
  });
});
