import { describe, it, expect } from "vitest";
import { createEngine, getEngine, Preferences } from "../src/engine";

describe("Mock Engine API & Scenarios", () => {
  const samplePrefs: Preferences = {
    city: "Bengaluru",
    workplace: { id: "wp", label: "Workplace", name: "Manyata Tech Park", lat: 13.0489, lon: 77.6200 },
    destinations: [],
    transportMode: "car",
    maxCommuteMin: 45,
    budgetMin: 20000,
    budgetMax: 60000,
    householdType: "balanced"
  };

  it("suggests places matching query", async () => {
    const engine = createEngine({ mode: "mock" });
    const suggestions = await engine.suggestPlaces("Koramangala");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.name).toBe("Koramangala");
  });

  it("completes normal search scenario with 12 ranked areas", async () => {
    const engine = createEngine({ mode: "mock", scenario: "normal" });
    const handle = engine.startSearch(samplePrefs);

    await new Promise<void>((resolve) => {
      handle.subscribe((state) => {
        if (state.isComplete) {
          expect(state.stage).toBe("done");
          expect(state.areas.length).toBe(12);
          expect(state.progress).toBe(100);
          expect(state.errors.length).toBe(0);
          resolve();
        }
      });
    });
  });

  it("handles empty search scenario", async () => {
    const engine = createEngine({ mode: "mock", scenario: "empty" });
    const handle = engine.startSearch(samplePrefs);

    await new Promise<void>((resolve) => {
      handle.subscribe((state) => {
        if (state.isComplete) {
          expect(state.stage).toBe("done");
          expect(state.areas.length).toBe(0);
          expect(state.totalCandidates).toBe(0);
          resolve();
        }
      });
    });
  });

  it("handles error scenario", async () => {
    const engine = createEngine({ mode: "mock", scenario: "error" });
    const handle = engine.startSearch(samplePrefs);

    await new Promise<void>((resolve) => {
      handle.subscribe((state) => {
        if (state.isComplete) {
          expect(state.stage).toBe("error");
          expect(state.errors.length).toBeGreaterThan(0);
          resolve();
        }
      });
    });
  });

  it("handles partial scenario with partial areas and warning", async () => {
    const engine = createEngine({ mode: "mock", scenario: "partial" });
    const handle = engine.startSearch(samplePrefs);

    await new Promise<void>((resolve) => {
      handle.subscribe((state) => {
        if (state.isComplete) {
          expect(state.areas.length).toBe(3);
          expect(state.errors.length).toBeGreaterThan(0);
          resolve();
        }
      });
    });
  });

  it("handles sparse-data scenario with low completeness and explicit nulls", async () => {
    const engine = createEngine({ mode: "mock", scenario: "sparse-data" });
    const handle = engine.startSearch(samplePrefs);

    await new Promise<void>((resolve) => {
      handle.subscribe((state) => {
        if (state.isComplete) {
          expect(state.areas.length).toBeGreaterThan(0);
          const first = state.areas[0];
          expect(first.dataCompleteness).toBeLessThan(0.6);
          expect(first.safetyIndicator.value).toBeNull();
          expect(first.safetyIndicator.note).toBeDefined();
          resolve();
        }
      });
    });
  });

  it("re-hydrates area detail and handles rent override", async () => {
    const engine = createEngine({ mode: "mock" });
    const areaId = "node/429918282";
    const detail = await engine.getArea(areaId);
    expect(detail).not.toBeNull();
    expect(detail?.name).toBe("Koramangala");

    // Set rent override
    const updated = await engine.setRentOverride(areaId, 45000);
    expect(updated?.userRentOverride).toBe(45000);
    expect(updated?.rentBand.source).toBe("user");
    expect(updated?.rentBand.confidence).toBe("high");
  });

  it("compares multiple areas side by side with winning metrics", async () => {
    const engine = createEngine({ mode: "mock" });
    const result = await engine.compare(["node/429918282", "relation/19883335"]);
    expect(result.areas.length).toBe(2);
    expect(result.rows.length).toBeGreaterThan(4);
    const matchRow = result.rows.find((r) => r.metric === "matchScore");
    expect(matchRow?.winnerId).toBeDefined();
  });

  it("manages saved areas reactively", () => {
    const engine = createEngine({ mode: "mock" });
    const id = "node/429918282";
    let notified = false;
    const unsub = engine.saved.subscribe(() => { notified = true; });

    expect(engine.saved.has(id)).toBe(false);
    engine.saved.toggle(id);
    expect(engine.saved.has(id)).toBe(true);
    expect(notified).toBe(true);

    engine.saved.toggle(id);
    expect(engine.saved.has(id)).toBe(false);
    unsub();
  });

  it("serializes and deserializes preferences to/from URL query params", () => {
    const engine = createEngine({ mode: "mock" });
    const query = engine.prefsToQuery(samplePrefs);
    expect(query).toContain("city=Bengaluru");
    expect(query).toContain("mode=car");

    const parsed = engine.queryToPrefs(query);
    expect(parsed?.city).toBe(samplePrefs.city);
    expect(parsed?.workplace.name).toBe(samplePrefs.workplace.name);
    expect(parsed?.maxCommuteMin).toBe(samplePrefs.maxCommuteMin);
  });

  it("provides method transparency info matching specification", () => {
    const engine = getEngine();
    const info = engine.method();
    expect(info.weights.budget).toBe(28);
    expect(info.weights.commute).toBe(27);
    expect(info.routingProfiles.car.available).toBe(true);
    expect(info.routingProfiles.bike.available).toBe(true);
    expect(info.routingProfiles.transit.available).toBe(false);
  });
});
