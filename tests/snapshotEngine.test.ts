import { describe, it, expect } from "vitest";
import { SnapshotEngine } from "../src/engine/snapshot/snapshotEngine";
import type { Preferences, SearchState } from "../src/engine/domain/types";

describe("SnapshotEngine (Demo Resilience)", () => {
  it("initializes and provides suggestions across demo cities", async () => {
    const engine = new SnapshotEngine({ mode: "snapshot" });
    const suggestions = await engine.suggestPlaces("Cyber");
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].name).toContain("Cyber");
  });

  it("completes search using recorded snapshot for Pune", async () => {
    const engine = new SnapshotEngine({ mode: "snapshot", snapshotCity: "Pune" });
    const prefs: Preferences = {
      city: "Pune",
      workplace: { id: "wp", label: "Workplace", name: "Hinjawadi", lat: 18.5927, lon: 73.7382 },
      destinations: [],
      transportMode: "car",
      maxCommuteMin: 45,
      budgetMax: 30000,
      householdType: "balanced"
    };

    const handle = engine.startSearch(prefs);
    const states: SearchState[] = [];
    const unsub = handle.subscribe((s) => {
      states.push(s);
    });

    // Wait for search stages to complete
    await new Promise((resolve) => setTimeout(resolve, 600));
    unsub();

    const finalState = handle.getState();
    expect(finalState.isComplete).toBe(true);
    expect(finalState.stage).toBe("done");
    expect(finalState.areas.length).toBeGreaterThan(0);
    expect(finalState.areas[0].name).toBe("Narayan Peth");
    expect(finalState.areas[0].matchScore).toBeGreaterThanOrEqual(85);
  });

  it("retrieves area detail and supports rent override", async () => {
    const engine = new SnapshotEngine({ mode: "snapshot" });
    const area = await engine.getArea("node/1218520286");
    expect(area).not.toBeNull();
    expect(area?.name).toBe("Narayan Peth");
    expect(area?.dataCompleteness).toBe(1.0);

    const rescored = await engine.setRentOverride("node/1218520286", 35000);
    expect(rescored).not.toBeNull();
    expect(rescored?.userRentOverride).toBe(35000);
    expect(rescored?.rentBand.source).toBe("user");
    expect(rescored?.rentBand.confidence).toBe("high");
  });

  it("handles side-by-side comparison of snapshot areas", async () => {
    const engine = new SnapshotEngine({ mode: "snapshot" });
    const comparison = await engine.compare(["node/1218520286", "node/1218520268"]);
    expect(comparison.areas.length).toBe(2);
    expect(comparison.rows.length).toBeGreaterThanOrEqual(5);
  });

  it("provides transparent methodology information", () => {
    const engine = new SnapshotEngine({ mode: "snapshot" });
    const method = engine.method();
    expect(method.limitations.length).toBeGreaterThan(0);
    expect(method.limitations[0]).toContain("Snapshot demo mode");
  });
});
