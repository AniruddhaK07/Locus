import { describe, it, expect } from "vitest";

import {
  resolveCityAlpha,
  computePeakCommute,
  computeEffectiveCommute,
  computeCommuteScore
} from "../src/engine/scoring/commute";
import {
  buildOsrmTableUrl,
  parseOsrmTableResponse,
  type OsrmTableResponse
} from "../src/engine/providers/routing/osrm";
import type { CommuteEstimate, Destination } from "../src/engine/domain/types";

describe("City Tier & Alpha Congestion Resolver", () => {
  it("resolves Tier 1 Mega-Metros with alpha 2.3", () => {
    expect(resolveCityAlpha("Bengaluru").alpha).toBe(2.3);
    expect(resolveCityAlpha("Bangalore Urban").alpha).toBe(2.3);
    expect(resolveCityAlpha("Mumbai").alpha).toBe(2.3);
    expect(resolveCityAlpha("Delhi").alpha).toBe(2.3);
    expect(resolveCityAlpha("New Delhi").alpha).toBe(2.3);
  });

  it("resolves Tier 1 Dense Metros with alpha 1.9", () => {
    expect(resolveCityAlpha("Hyderabad").alpha).toBe(1.9);
    expect(resolveCityAlpha("Chennai").alpha).toBe(1.9);
    expect(resolveCityAlpha("Kolkata").alpha).toBe(1.9);
  });

  it("resolves Tier 2 Large Metros with alpha 1.6", () => {
    expect(resolveCityAlpha("Pune").alpha).toBe(1.6);
    expect(resolveCityAlpha("Ahmedabad").alpha).toBe(1.6);
  });

  it("falls back to Tier 3 Standard with alpha 1.2 for other cities", () => {
    expect(resolveCityAlpha("Mysuru").alpha).toBe(1.2);
    expect(resolveCityAlpha("Coimbatore").alpha).toBe(1.2);
    expect(resolveCityAlpha("").alpha).toBe(1.2);
    expect(resolveCityAlpha(undefined, "Nagpur").alpha).toBe(1.2);
  });
});

describe("Peak Congestion Heuristic", () => {
  it("computes realistic peak commute multiplier matching corridor calibration", () => {
    // Bengaluru test: 22 min freeflow, 18 km, alpha 2.3 (Manyata to Koramangala corridor)
    const result = computePeakCommute(22, 18, 2.3);

    // Expected: ~65-70 min peak central estimate
    expect(result.peakMin).toBeGreaterThanOrEqual(60);
    expect(result.peakMin).toBeLessThanOrEqual(75);
    expect(result.lowRangeMin).toBeLessThan(result.peakMin);
    expect(result.highRangeMin).toBeGreaterThan(result.peakMin);
  });

  it("scales monotonically with distance and free-flow duration", () => {
    const shortDist = computePeakCommute(10, 3, 2.3);
    const longDist = computePeakCommute(10, 15, 2.3);

    expect(longDist.peakMin).toBeGreaterThan(shortDist.peakMin);
  });

  it("preserves minimum positive duration when inputs are small", () => {
    const minTrip = computePeakCommute(1, 0.5, 1.2);
    expect(minTrip.peakMin).toBeGreaterThanOrEqual(1);
    expect(minTrip.lowRangeMin).toBeGreaterThanOrEqual(1);
  });
});

describe("Multi-Destination Blending (70% Primary + 30% Extras)", () => {
  const makeCommute = (label: string, peakVal: number | null): CommuteEstimate => ({
    destinationId: label,
    destinationLabel: label,
    freeFlowMin: { value: peakVal ? Math.round(peakVal / 2) : null, source: "routing", confidence: "medium" },
    peakEstimateMin: {
      value: peakVal,
      source: "heuristic",
      confidence: "low",
      note: peakVal ? `peak estimate ${peakVal}m` : "unavailable"
    },
    distanceKm: { value: 10, source: "routing", confidence: "high" },
    mode: "car",
    exceedsMax: false
  });

  it("returns primary destination peak directly when single destination", () => {
    const single = [makeCommute("Workplace", 45)];
    const effective = computeEffectiveCommute(single);

    expect(effective.value).toBe(45);
    expect(effective.source).toBe("heuristic");
    expect(effective.confidence).toBe("low");
  });

  it("applies 70/30 weighting when extra destinations exist", () => {
    // Primary: 60 min, Secondary: 30 min -> 0.7 * 60 + 0.3 * 30 = 42 + 9 = 51 min
    const multiple = [makeCommute("Workplace", 60), makeCommute("Gym", 30)];
    const effective = computeEffectiveCommute(multiple);

    expect(effective.value).toBe(51);
    expect(effective.note).toContain("70% Workplace (60m)");
  });

  it("handles multiple extra destinations averaging them in the 30% weight", () => {
    // Primary: 50m (weight 0.7 = 35)
    // Extra 1: 20m, Extra 2: 40m -> mean = 30m (weight 0.3 = 9)
    // Total = 44m
    const three = [
      makeCommute("Workplace", 50),
      makeCommute("Gym", 20),
      makeCommute("School", 40)
    ];
    const effective = computeEffectiveCommute(three);

    expect(effective.value).toBe(44);
  });

  it("isolates failures: returns null if primary is unavailable", () => {
    const failedPrimary = [makeCommute("Workplace", null), makeCommute("Gym", 25)];
    const effective = computeEffectiveCommute(failedPrimary);

    expect(effective.value).toBeNull();
    expect(effective.source).toBe("unavailable");
  });
});

describe("Commute Score Decay Utility", () => {
  it("decays smoothly using exp(-k * t / tMax)", () => {
    expect(computeCommuteScore(0, 45)).toBe(100);
    // At t = tMax (45 / 45 = 1): 100 * exp(-1) = 36.78 -> 37
    expect(computeCommuteScore(45, 45)).toBe(37);
    // Monotonically decreases
    expect(computeCommuteScore(20, 45)!).toBeGreaterThan(computeCommuteScore(35, 45)!);
    expect(computeCommuteScore(35, 45)!).toBeGreaterThan(computeCommuteScore(50, 45)!);
  });

  it("returns null if commute is null or maxCommute is zero", () => {
    expect(computeCommuteScore(null, 45)).toBeNull();
    expect(computeCommuteScore(30, 0)).toBeNull();
  });
});

describe("OSRM Table URL Builder & Parser", () => {
  it("builds table matrix query with sources and destinations indices", () => {
    const destinations: Destination[] = [
      { id: "dest1", label: "Work", name: "Manyata", lat: 13.0489, lon: 77.6200 }
    ];
    const origins = [
      { lat: 12.9352, lon: 77.6245 },
      { lat: 12.9716, lon: 77.5946 }
    ];

    const url = buildOsrmTableUrl("https://routing.openstreetmap.de/routed-car", origins, destinations);

    expect(url).toContain("table/v1/driving/");
    expect(url).toContain("sources=1;2");
    expect(url).toContain("destinations=0");
    expect(url).toContain("annotations=duration,distance");
  });

  it("parses OSRM table response into structured LocalityCommuteResults", () => {
    const destinations: Destination[] = [
      { id: "dest1", label: "Office", name: "Office", lat: 13.0, lon: 77.6 }
    ];
    const origins = [
      { lat: 12.9, lon: 77.5 },
      { lat: 12.8, lon: 77.4 }
    ];

    const mockResponse: OsrmTableResponse = {
      code: "Ok",
      durations: [
        [1200], // 20 min in seconds
        [null]  // Unreachable
      ],
      distances: [
        [15000], // 15 km in meters
        [null]
      ]
    };

    const results = parseOsrmTableResponse(
      mockResponse,
      origins,
      destinations,
      "car",
      2.3, // Bengaluru alpha
      45   // Max commute
    );

    expect(results.length).toBe(2);

    // Locality 0: valid commute
    const loc0 = results[0];
    expect(loc0.commutes[0].freeFlowMin.value).toBe(20);
    expect(loc0.commutes[0].freeFlowMin.source).toBe("routing");
    expect(loc0.commutes[0].distanceKm.value).toBe(15);
    expect(loc0.commutes[0].peakEstimateMin.value).toBeGreaterThan(20);
    expect(loc0.effectiveCommuteMin.value).toBe(loc0.commutes[0].peakEstimateMin.value);

    // Locality 1: unreachable
    const loc1 = results[1];
    expect(loc1.commutes[0].freeFlowMin.value).toBeNull();
    expect(loc1.commutes[0].freeFlowMin.note).toBe("Unreachable by road network");
    expect(loc1.effectiveCommuteMin.value).toBeNull();
  });
});
