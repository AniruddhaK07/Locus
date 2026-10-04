import { describe, it, expect, vi } from "vitest";
import {
  compareAreas,
  buildPortalLinks,
  SavedStore,
  type AreaDetail
} from "../src/engine";

describe("Phase 8: Features — Compare, Saved, and Portal Links", () => {
  const createMockArea = (overrides: Partial<AreaDetail>): AreaDetail => ({
    id: "node/1",
    name: "Sample Locality",
    lat: 12.97,
    lon: 77.64,
    rank: 1,
    matchScore: 85,
    confidence: "high",
    dataCompleteness: 0.9,
    explanation: "Good commute and daily amenities",
    keyFacts: ["20m peak drive", "High grocery access", "₹30k est rent"],
    effectiveCommuteMin: { value: 20, source: "heuristic", confidence: "low" },
    rentBand: { value: { low: 25000, high: 35000 }, source: "heuristic", confidence: "low" },
    safetyIndicator: { value: 7.5, source: "osm", confidence: "medium" },
    amenitiesScore: { value: 8.0, source: "osm", confidence: "high" },
    osmType: "node",
    osmId: 1,
    amenities: {
      healthcare: { value: 10, source: "osm", confidence: "high" },
      education: { value: 12, source: "osm", confidence: "high" },
      grocery: { value: 15, source: "osm", confidence: "high" },
      food: { value: 25, source: "osm", confidence: "high" },
      leisure: { value: 10, source: "osm", confidence: "high" },
      busStops: { value: 5, source: "osm", confidence: "high" },
      railStations: { value: 1, source: "osm", confidence: "high" }
    },
    commutes: [],
    scoreBreakdown: [],
    safetyDetails: {
      policeCount: { value: 1, source: "osm", confidence: "medium" },
      litRoadsCount: { value: 20, source: "osm", confidence: "high" },
      surveillanceCount: { value: 5, source: "osm", confidence: "medium" },
      coverageNote: "dense"
    },
    ...overrides
  });

  describe("Comparison & Winner Evaluation (§4.8)", () => {
    it("compares multiple localities across 6 metric rows", () => {
      const areaA = createMockArea({
        id: "node/A",
        name: "Area A",
        matchScore: 92,
        effectiveCommuteMin: { value: 18, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 22000, high: 32000 }, source: "heuristic", confidence: "low" },
        amenitiesScore: { value: 8.5, source: "osm", confidence: "high" },
        safetyIndicator: { value: 7.0, source: "osm", confidence: "medium" },
        dataCompleteness: 1.0
      });

      const areaB = createMockArea({
        id: "node/B",
        name: "Area B",
        matchScore: 84,
        effectiveCommuteMin: { value: 32, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 30000, high: 45000 }, source: "heuristic", confidence: "low" },
        amenitiesScore: { value: 9.2, source: "osm", confidence: "high" },
        safetyIndicator: { value: 8.5, source: "osm", confidence: "high" },
        dataCompleteness: 0.85
      });

      const result = compareAreas([areaA, areaB]);

      expect(result.areas).toHaveLength(2);
      expect(result.rows).toHaveLength(6);

      // Area A wins match score (92 vs 84)
      const matchRow = result.rows.find((r) => r.metric === "matchScore");
      expect(matchRow?.winnerId).toBe("node/A");
      expect(matchRow?.values["node/A"].value).toBe("92/100");

      // Area A wins commute (18m vs 32m - lower is better)
      const commuteRow = result.rows.find((r) => r.metric === "commute");
      expect(commuteRow?.winnerId).toBe("node/A");

      // Area A wins rent (midpoint 27k vs 37.5k - lower is better)
      const rentRow = result.rows.find((r) => r.metric === "rent");
      expect(rentRow?.winnerId).toBe("node/A");

      // Area B wins amenities (9.2 vs 8.5)
      const amenitiesRow = result.rows.find((r) => r.metric === "amenities");
      expect(amenitiesRow?.winnerId).toBe("node/B");

      // Area B wins safety (8.5 vs 7.0)
      const safetyRow = result.rows.find((r) => r.metric === "safety");
      expect(safetyRow?.winnerId).toBe("node/B");

      // Area A wins completeness (100% vs 85%)
      const compRow = result.rows.find((r) => r.metric === "completeness");
      expect(compRow?.winnerId).toBe("node/A");
    });

    it("prioritizes user rent override in rent row comparison", () => {
      const areaA = createMockArea({
        id: "node/A",
        name: "Area A",
        userRentOverride: 28000
      });

      const areaB = createMockArea({
        id: "node/B",
        name: "Area B",
        rentBand: { value: { low: 30000, high: 40000 }, source: "heuristic", confidence: "low" }
      });

      const result = compareAreas([areaA, areaB]);
      const rentRow = result.rows.find((r) => r.metric === "rent");

      // Area A has known rent 28k < Area B midpoint 35k
      expect(rentRow?.winnerId).toBe("node/A");
      expect(rentRow?.values["node/A"].value).toBe("₹28,000 (user)");
    });

    it("handles metric ties gracefully without assigning arbitrary winner", () => {
      const areaA = createMockArea({ id: "node/A", matchScore: 85 });
      const areaB = createMockArea({ id: "node/B", matchScore: 85 });

      const result = compareAreas([areaA, areaB]);
      const matchRow = result.rows.find((r) => r.metric === "matchScore");
      expect(matchRow?.winnerId).toBeUndefined();
    });

    it("handles missing/null metrics so valid metric wins", () => {
      const areaA = createMockArea({
        id: "node/A",
        effectiveCommuteMin: { value: null, source: "unavailable", confidence: "none" }
      });

      const areaB = createMockArea({
        id: "node/B",
        effectiveCommuteMin: { value: 25, source: "heuristic", confidence: "low" }
      });

      const result = compareAreas([areaA, areaB]);
      const commuteRow = result.rows.find((r) => r.metric === "commute");
      expect(commuteRow?.winnerId).toBe("node/B");
      expect(commuteRow?.values["node/A"].value).toBe("Unavailable");
    });
  });

  describe("SavedStore Reactive Persistence (§4.8)", () => {
    it("manages saved areas with toggle, has, list, and subscriptions", () => {
      const store = new SavedStore("test_saved_key_1");
      const subscriber = vi.fn();

      const unsubscribe = store.subscribe(subscriber);

      expect(store.list()).toHaveLength(0);
      expect(store.has("node/101")).toBe(false);

      // Toggle on
      store.toggle("node/101");
      expect(store.has("node/101")).toBe(true);
      expect(store.list()).toEqual(["node/101"]);
      expect(subscriber).toHaveBeenCalledTimes(1);

      // Toggle off
      store.toggle("node/101");
      expect(store.has("node/101")).toBe(false);
      expect(store.list()).toHaveLength(0);
      expect(subscriber).toHaveBeenCalledTimes(2);

      unsubscribe();
      store.toggle("node/202");
      // Subscriber should not be called after unsubscribe
      expect(subscriber).toHaveBeenCalledTimes(2);
    });
  });

  describe("Portal Link Builders (§4.7)", () => {
    it("generates verified search query links without guessing slug IDs", () => {
      const links = buildPortalLinks("Koramangala 4th Block", "Bengaluru");

      expect(links).toHaveLength(4);

      // MagicBricks
      const mb = links.find((l) => l.portal === "MagicBricks");
      expect(mb?.url).toContain("keyword=Koramangala%204th%20Block%20Bengaluru");
      expect(mb?.isFallback).toBe(false);

      // Housing.com
      const housing = links.find((l) => l.portal === "Housing.com");
      expect(housing?.url).toContain("search?q=Koramangala%204th%20Block%20Bengaluru");
      expect(housing?.isFallback).toBe(false);

      // 99acres
      const acres = links.find((l) => l.portal === "99acres");
      expect(acres?.url).toContain("keyword=Koramangala%204th%20Block%20Bengaluru");
      expect(acres?.isFallback).toBe(false);

      // Universal search fallback
      const fallback = links.find((l) => l.isFallback);
      expect(fallback?.portal).toBe("Web Search");
      expect(fallback?.url).toContain("google.com/search?q=");
      expect(fallback?.url).toContain("flats%20for%20rent%20in%20Koramangala%204th%20Block%20Bengaluru");
    });
  });
});
