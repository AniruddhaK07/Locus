import { describe, it, expect, vi } from "vitest";
import {
  SearchPipeline,
  LiveEngine,
  createEngine,
  type Preferences,
  type SearchState,
  type AreaSummary
} from "../src/engine";
import { MemoryStorageAdapter } from "../src/engine/infra/storage";
import type { NominatimGeocodingProvider } from "../src/engine/providers/geocoding/nominatim";
import type { OverpassLocalityProvider } from "../src/engine/providers/localities/overpass";
import type { OsrmRoutingProvider } from "../src/engine/providers/routing/osrm";
import type { OverpassAmenityProvider } from "../src/engine/providers/amenities/overpass";
import { DefaultRentProvider } from "../src/engine/providers/rent";

describe("Phase 7: Pipeline Orchestration & Live Engine", () => {
  const samplePrefs: Preferences = {
    city: "Bengaluru",
    workplace: { id: "wp-1", label: "Workplace", name: "Manyata Tech Park", lat: 13.045, lon: 77.62 },
    destinations: [
      { id: "dest-2", label: "Gym", name: "Cult Fit", lat: 12.97, lon: 77.59 }
    ],
    transportMode: "car",
    maxCommuteMin: 45,
    budgetMin: 20000,
    budgetMax: 50000,
    householdType: "family",
    priorityFocus: "commute"
  };

  const createMockDeps = (opts?: { failAmenityAreaId?: string }) => {
    const fakeGeocoding = {
      resolveCity: vi.fn().mockResolvedValue({
        query: "Bengaluru",
        placeId: 12345,
        name: "Bengaluru",
        lat: 12.9716,
        lon: 77.5946,
        osmType: "relation",
        osmId: 79510,
        relationId: 79510
      })
    } as unknown as NominatimGeocodingProvider;

    const fakeLocalities = {
      discoverLocalities: vi.fn().mockResolvedValue({
        localities: [
          { id: "node/101", name: "Koramangala", osmType: "node", osmId: 101, lat: 12.935, lon: 77.624 },
          { id: "way/202", name: "Indiranagar", osmType: "way", osmId: 202, lat: 12.978, lon: 77.640 },
          { id: "relation/303", name: "Hebbal", osmType: "relation", osmId: 303, lat: 13.035, lon: 77.597 }
        ],
        totalCandidates: 3,
        sourceNote: "Mock discovered"
      })
    } as unknown as OverpassLocalityProvider;

    const fakeRouting = {
      calculateCommutes: vi.fn().mockImplementation((req) => {
        return Promise.resolve(
          req.origins.map((_origin: unknown, idx: number) => ({
            commutes: req.destinations.map((d: { id: string; label: string }) => ({
              destinationId: d.id,
              destinationLabel: d.label,
              freeFlowMin: { value: 15 + idx * 5, source: "routing", confidence: "medium" },
              peakEstimateMin: { value: 25 + idx * 8, source: "heuristic", confidence: "low" },
              distanceKm: { value: 8 + idx * 3, source: "routing", confidence: "high" },
              mode: req.mode,
              exceedsMax: false
            })),
            effectiveCommuteMin: { value: 22 + idx * 6, source: "heuristic", confidence: "low" },
            exceedsMax: false
          }))
        );
      })
    } as unknown as OsrmRoutingProvider;

    const fakeAmenities = {
      getProfile: vi.fn().mockImplementation((coords: { lat: number; lon: number }) => {
        if (opts?.failAmenityAreaId && coords.lat === 12.978) {
          // Simulate failure on Indiranagar
          return Promise.reject(new Error("Overpass 504 Gateway Timeout"));
        }
        return Promise.resolve({
          amenities: {
            healthcare: { value: 12, source: "osm", confidence: "high" },
            education: { value: 15, source: "osm", confidence: "high" },
            grocery: { value: 20, source: "osm", confidence: "high" },
            food: { value: 35, source: "osm", confidence: "high" },
            leisure: { value: 18, source: "osm", confidence: "high" },
            busStops: { value: 8, source: "osm", confidence: "high" },
            railStations: { value: 1, source: "osm", confidence: "high" }
          },
          safety: {
            policeCount: { value: 2, source: "osm", confidence: "high" },
            litRoadsCount: { value: 25, source: "osm", confidence: "high" },
            surveillanceCount: { value: 8, source: "osm", confidence: "high" },
            coverageNote: "dense"
          },
          totalMappedObjects: 119
        });
      })
    } as unknown as OverpassAmenityProvider;

    const rentProvider = new DefaultRentProvider();

    return {
      geocoding: fakeGeocoding,
      localities: fakeLocalities,
      routing: fakeRouting,
      amenities: fakeAmenities,
      rent: rentProvider
    };
  };

  describe("SearchPipeline Progressive Execution (§4.6)", () => {
    it("emits states progressively and produces ranked results", async () => {
      const deps = createMockDeps();
      const pipeline = new SearchPipeline(deps);
      const emittedStages: SearchState["stage"][] = [];
      const abortController = new AbortController();

      const result = await pipeline.execute(
        "test-search-1",
        samplePrefs,
        abortController.signal,
        (state) => {
          emittedStages.push(state.stage);
        }
      );

      // Verify stages were executed in sequence
      expect(emittedStages).toContain("resolving-city");
      expect(emittedStages).toContain("discovering-localities");
      expect(emittedStages).toContain("routing");
      expect(emittedStages).toContain("profiling-amenities");
      expect(emittedStages).toContain("scoring");
      expect(emittedStages).toContain("done");

      // Verify areas result
      expect(result.areas).toHaveLength(3);
      expect(result.areas[0].rank).toBe(1);
      expect(result.areas[1].rank).toBe(2);
      expect(result.areas[2].rank).toBe(3);
      expect(result.areas[0].matchScore).toBeGreaterThanOrEqual(result.areas[1].matchScore);
      expect(result.details.size).toBe(3);
    });

    it("isolates per-locality failures without terminating the pipeline", async () => {
      const deps = createMockDeps({ failAmenityAreaId: "way/202" });
      const pipeline = new SearchPipeline(deps);
      const states: SearchState[] = [];
      const abortController = new AbortController();

      const result = await pipeline.execute(
        "test-search-fail",
        samplePrefs,
        abortController.signal,
        (s) => states.push(s)
      );

      // Final state should still be done
      const lastState = states[states.length - 1];
      expect(lastState.stage).toBe("done");
      expect(lastState.isComplete).toBe(true);

      // All 3 localities should be returned
      expect(result.areas).toHaveLength(3);

      // Locality error must be recorded for way/202
      expect(lastState.localityErrors?.["way/202"]).toContain("504 Gateway Timeout");

      // way/202 detail should show null amenities and lowered completeness
      const failedDetail = result.details.get("way/202");
      expect(failedDetail).toBeDefined();
      expect(failedDetail?.amenities.healthcare.value).toBeNull();
      expect(failedDetail?.dataCompleteness).toBeLessThan(1.0);
    });

    it("handles search cancellation cleanly without uncaught errors", async () => {
      const deps = createMockDeps();
      const pipeline = new SearchPipeline(deps);
      const abortController = new AbortController();

      // Abort immediately
      abortController.abort();

      const states: SearchState[] = [];
      const result = await pipeline.execute(
        "test-search-abort",
        samplePrefs,
        abortController.signal,
        (s) => states.push(s)
      );

      expect(result.areas).toHaveLength(0);
      const lastState = states[states.length - 1];
      expect(lastState.statusMessage).toContain("cancelled");
    });
  });

  describe("URL Sharing & Query Serialization (§4.8)", () => {
    it("serializes and deserializes preferences round-trip", () => {
      const storage = new MemoryStorageAdapter();
      const engine = new LiveEngine({ mode: "live", storage });

      const query = engine.prefsToQuery(samplePrefs);
      expect(query).toContain("city=Bengaluru");
      expect(query).toContain("mode=car");
      expect(query).toContain("budgetMax=50000");

      const parsed = engine.queryToPrefs(query);
      expect(parsed).not.toBeNull();
      expect(parsed?.city).toBe(samplePrefs.city);
      expect(parsed?.workplace.name).toBe(samplePrefs.workplace.name);
      expect(parsed?.transportMode).toBe(samplePrefs.transportMode);
      expect(parsed?.maxCommuteMin).toBe(samplePrefs.maxCommuteMin);
      expect(parsed?.budgetMax).toBe(samplePrefs.budgetMax);
      expect(parsed?.householdType).toBe(samplePrefs.householdType);
      expect(parsed?.priorityFocus).toBe(samplePrefs.priorityFocus);
      expect(parsed?.destinations).toHaveLength(1);
    });

    it("returns null on invalid or empty query string", () => {
      const engine = new LiveEngine({ mode: "live", storage: new MemoryStorageAdapter() });
      expect(engine.queryToPrefs("")).toBeNull();
      expect(engine.queryToPrefs("random=junk")).toBeNull();
    });
  });

  describe("LiveEngine Public API & Persistence (§5.3)", () => {
    it("instantiates LiveEngine when mode='live'", () => {
      const engine = createEngine({ mode: "live" });
      expect(engine).toBeInstanceOf(LiveEngine);
      expect(engine.getScenario()).toBe("normal");
    });

    it("persists and re-hydrates area detail across sessions", async () => {
      const storage = new MemoryStorageAdapter();
      const engine = new LiveEngine({ mode: "live", storage });

      // Simulate completed search cache
      const sampleArea: AreaSummary = {
        id: "node/999",
        name: "Indiranagar 100ft",
        lat: 12.97,
        lon: 77.64,
        rank: 1,
        matchScore: 88,
        confidence: "high",
        dataCompleteness: 0.95,
        explanation: "22 min peak car · strong amenities · rent estimate",
        keyFacts: ["22m peak car", "High grocery access", "₹35k-50k est. rent"],
        effectiveCommuteMin: { value: 22, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 35000, high: 50000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 7.2, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 8.9, source: "osm", confidence: "high" }
      };

      await storage.set(
        "locus_area_node/999",
        {
          ...sampleArea,
          osmType: "node",
          osmId: 999,
          amenities: {
            healthcare: { value: 10, source: "osm", confidence: "high" },
            education: { value: 10, source: "osm", confidence: "high" },
            grocery: { value: 10, source: "osm", confidence: "high" },
            food: { value: 20, source: "osm", confidence: "high" },
            leisure: { value: 15, source: "osm", confidence: "high" },
            busStops: { value: 5, source: "osm", confidence: "high" },
            railStations: { value: 1, source: "osm", confidence: "high" }
          },
          commutes: [],
          scoreBreakdown: [],
          safetyDetails: {
            policeCount: { value: 1, source: "osm", confidence: "medium" },
            litRoadsCount: { value: 10, source: "osm", confidence: "medium" },
            surveillanceCount: { value: 2, source: "osm", confidence: "medium" },
            coverageNote: "moderate"
          }
        },
        24 * 60 * 60 * 1000
      );

      // Direct navigation to /area/node/999
      const rehydrated = await engine.getArea("node/999");
      expect(rehydrated).not.toBeNull();
      expect(rehydrated?.name).toBe("Indiranagar 100ft");
      expect(rehydrated?.matchScore).toBe(88);
    });

    it("applies user rent override and persists updated detail", async () => {
      const storage = new MemoryStorageAdapter();
      const engine = new LiveEngine({ mode: "live", storage });

      // Seed detail in storage
      await storage.set(
        "locus_area_node/555",
        {
          id: "node/555",
          name: "HSR Layout",
          lat: 12.91,
          lon: 77.63,
          rank: 2,
          matchScore: 80,
          confidence: "medium",
          dataCompleteness: 0.9,
          explanation: "Commute ok · rent band estimate",
          keyFacts: ["25m commute", "Good food", "Est rent"],
          effectiveCommuteMin: { value: 25, source: "heuristic", confidence: "low" },
          rentBand: { value: { low: 25000, high: 45000 }, source: "heuristic", confidence: "low" },
          safetyIndicator: { value: 6.5, source: "osm", confidence: "medium" },
          amenitiesScore: { value: 8.0, source: "osm", confidence: "high" },
          osmType: "node",
          osmId: 555,
          amenities: {
            healthcare: { value: 5, source: "osm", confidence: "medium" },
            education: { value: 5, source: "osm", confidence: "medium" },
            grocery: { value: 10, source: "osm", confidence: "medium" },
            food: { value: 15, source: "osm", confidence: "medium" },
            leisure: { value: 5, source: "osm", confidence: "medium" },
            busStops: { value: 3, source: "osm", confidence: "medium" },
            railStations: { value: 0, source: "osm", confidence: "high" }
          },
          commutes: [],
          scoreBreakdown: [],
          safetyDetails: {
            policeCount: { value: 1, source: "osm", confidence: "medium" },
            litRoadsCount: { value: 5, source: "osm", confidence: "low" },
            surveillanceCount: { value: 0, source: "osm", confidence: "medium" },
            coverageNote: "moderate"
          }
        },
        24 * 60 * 60 * 1000
      );

      const updated = await engine.setRentOverride("node/555", 38000);
      expect(updated).not.toBeNull();
      expect(updated?.userRentOverride).toBe(38000);
      expect(updated?.rentBand.source).toBe("user");
      expect(updated?.rentBand.confidence).toBe("high");
      expect(updated?.rentBand.value).toEqual({ low: 38000, high: 38000 });
    });

    it("compares multiple localities and identifies metric winners", async () => {
      const storage = new MemoryStorageAdapter();
      const engine = new LiveEngine({ mode: "live", storage });

      // Seed two areas
      const baseArea = {
        confidence: "high" as const,
        dataCompleteness: 0.9,
        explanation: "test",
        keyFacts: ["a", "b", "c"],
        osmType: "node" as const,
        osmId: 1,
        amenities: {
          healthcare: { value: 5, source: "osm" as const, confidence: "medium" as const },
          education: { value: 5, source: "osm" as const, confidence: "medium" as const },
          grocery: { value: 10, source: "osm" as const, confidence: "medium" as const },
          food: { value: 15, source: "osm" as const, confidence: "medium" as const },
          leisure: { value: 5, source: "osm" as const, confidence: "medium" as const },
          busStops: { value: 3, source: "osm" as const, confidence: "medium" as const },
          railStations: { value: 0, source: "osm" as const, confidence: "high" as const }
        },
        commutes: [],
        scoreBreakdown: [],
        safetyDetails: {
          policeCount: { value: 1, source: "osm" as const, confidence: "medium" as const },
          litRoadsCount: { value: 5, source: "osm" as const, confidence: "low" as const },
          surveillanceCount: { value: 0, source: "osm" as const, confidence: "medium" as const },
          coverageNote: "moderate"
        }
      };

      await storage.set("locus_area_node/1", {
        ...baseArea,
        id: "node/1",
        name: "Area One",
        lat: 12.9,
        lon: 77.6,
        rank: 1,
        matchScore: 90,
        effectiveCommuteMin: { value: 20, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 20000, high: 30000 }, source: "heuristic", confidence: "low" },
        amenitiesScore: { value: 9.0, source: "osm", confidence: "high" },
        safetyIndicator: { value: 8.0, source: "osm", confidence: "high" }
      });

      await storage.set("locus_area_node/2", {
        ...baseArea,
        id: "node/2",
        name: "Area Two",
        lat: 12.95,
        lon: 77.65,
        rank: 2,
        matchScore: 75,
        effectiveCommuteMin: { value: 35, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 30000, high: 45000 }, source: "heuristic", confidence: "low" },
        amenitiesScore: { value: 7.0, source: "osm", confidence: "high" },
        safetyIndicator: { value: 6.0, source: "osm", confidence: "medium" }
      });

      const comp = await engine.compare(["node/1", "node/2"]);
      expect(comp.areas).toHaveLength(2);
      expect(comp.rows).toHaveLength(6);

      const matchRow = comp.rows.find((r) => r.metric === "matchScore");
      expect(matchRow?.winnerId).toBe("node/1");

      const commuteRow = comp.rows.find((r) => r.metric === "commute");
      expect(commuteRow?.winnerId).toBe("node/1");
    });

    it("provides honest methodology info without copy fabrication", () => {
      const engine = new LiveEngine({ mode: "live", storage: new MemoryStorageAdapter() });
      const method = engine.method();

      expect(method.weights.budget).toBe(28);
      expect(method.weights.commute).toBe(27);
      expect(method.confidenceFactors.high).toBe(1.0);
      expect(method.radii.grocery).toBe(800);
      expect(method.routingProfiles.car.available).toBe(true);
      expect(method.routingProfiles.transit.available).toBe(false);
      expect(method.limitations.length).toBeGreaterThan(0);
    });

    it("generates portal links with verified query format", () => {
      const engine = new LiveEngine({ mode: "live", storage: new MemoryStorageAdapter() });
      const sampleArea: AreaSummary = {
        id: "node/123",
        name: "Bellandur",
        lat: 12.92,
        lon: 77.67,
        rank: 1,
        matchScore: 85,
        confidence: "high",
        dataCompleteness: 0.9,
        explanation: "good",
        keyFacts: ["a", "b", "c"],
        effectiveCommuteMin: { value: 20, source: "heuristic", confidence: "low" },
        rentBand: { value: { low: 25000, high: 40000 }, source: "heuristic", confidence: "low" },
        safetyIndicator: { value: 7.0, source: "osm", confidence: "medium" },
        amenitiesScore: { value: 8.0, source: "osm", confidence: "high" }
      };

      const links = engine.portals(sampleArea);
      expect(links).toHaveLength(4);
      expect(links.find((l) => l.isFallback)?.url).toContain("google.com/search?q=");
    });
  });
});
