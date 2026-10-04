import { describe, it, expect } from "vitest";
import { getEngine, selectAreas, type AreaSummary } from "../src/engine";

describe("Phase U2: Results Scenarios & Selection Filtering", () => {
  const engine = getEngine();

  const mockAreas: AreaSummary[] = [
    {
      id: "node/1",
      name: "Locality Alpha",
      lat: 12.97,
      lon: 77.64,
      rank: 1,
      matchScore: 92,
      confidence: "high",
      dataCompleteness: 0.9,
      explanation: "Near workplace with dense amenities",
      keyFacts: ["18 min commute", "High grocery", "₹32k rent"],
      effectiveCommuteMin: { value: 18, source: "heuristic", confidence: "low" },
      rentBand: { value: { low: 28000, high: 36000 }, source: "heuristic", confidence: "low" },
      safetyIndicator: { value: 8.0, source: "osm", confidence: "medium" },
      amenitiesScore: { value: 8.5, source: "osm", confidence: "high" },
    },
    {
      id: "node/2",
      name: "Locality Beta",
      lat: 12.93,
      lon: 77.62,
      rank: 2,
      matchScore: 78,
      confidence: "low",
      dataCompleteness: 0.5,
      explanation: "Further away but lower rent",
      keyFacts: ["42 min commute", "Moderate grocery", "₹22k rent"],
      effectiveCommuteMin: { value: 42, source: "heuristic", confidence: "low" },
      rentBand: { value: { low: 18000, high: 26000 }, source: "heuristic", confidence: "low" },
      safetyIndicator: { value: 6.5, source: "osm", confidence: "low" },
      amenitiesScore: { value: 6.0, source: "osm", confidence: "medium" },
    },
  ];

  it("filters candidate areas by maximum commute using pure engine selectAreas", () => {
    const under30 = selectAreas(mockAreas, {
      filters: { maxCommuteMin: 30 },
    });
    expect(under30).toHaveLength(1);
    expect(under30[0].name).toBe("Locality Alpha");

    const under50 = selectAreas(mockAreas, {
      filters: { maxCommuteMin: 50 },
    });
    expect(under50).toHaveLength(2);
  });

  it("filters out low confidence items when hideLowConfidence is active", () => {
    const highOnly = selectAreas(mockAreas, {
      filters: { hideLowConfidence: true },
    });
    expect(highOnly).toHaveLength(1);
    expect(highOnly[0].confidence).toBe("high");
  });

  it("sorts candidate areas by rent ascending using selectAreas", () => {
    const byRent = selectAreas(mockAreas, { sort: "rent" });
    expect(byRent[0].name).toBe("Locality Beta"); // 22k midpoint < 32k midpoint
  });

  it("sorts candidate areas by commute ascending using selectAreas", () => {
    const byCommute = selectAreas(mockAreas, { sort: "commute" });
    expect(byCommute[0].name).toBe("Locality Alpha"); // 18m < 42m
  });

  it("executes mock search pipeline across scenarios", async () => {
    const prefs = {
      city: "Bengaluru",
      workplace: { id: "wp", label: "Workplace", name: "Manyata", lat: 13.04, lon: 77.62 },
      destinations: [],
      transportMode: "car" as const,
      maxCommuteMin: 45,
      budgetMin: 20000,
      budgetMax: 60000,
      householdType: "balanced" as const,
    };

    engine.setScenario("normal");
    const handle = engine.startSearch(prefs);
    let state = handle.getState();

    await new Promise<void>((resolve) => {
      const unsub = handle.subscribe((s) => {
        state = s;
        if (s.isComplete) {
          unsub();
          resolve();
        }
      });
    });

    expect(state.isComplete).toBe(true);
    expect(state.areas.length).toBeGreaterThan(0);
    expect(state.areas[0].rank).toBe(1);
  });

  it("renders AreaCard in sparse-data scenario with explicit honest labels", async () => {
    const { renderToString } = await import("react-dom/server");
    const React = await import("react");
    const { MemoryRouter } = await import("react-router-dom");
    const { AreaCard } = await import("../src/ui/components/AreaCard");

    engine.setScenario("sparse-data");
    const handle = engine.startSearch({
      city: "Bengaluru",
      workplace: { id: "wp", label: "Workplace", name: "Manyata", lat: 13.04, lon: 77.62 },
      destinations: [],
      transportMode: "car",
      maxCommuteMin: 90,
      budgetMin: 20000,
      budgetMax: 60000,
      householdType: "balanced",
    });

    await new Promise<void>((resolve) => {
      handle.subscribe((s) => {
        if (s.isComplete) {
          const html = renderToString(
            React.createElement(MemoryRouter, null,
              React.createElement(AreaCard, {
                area: s.areas[0],
                isSaved: false,
                onToggleSave: () => {},
                isCompared: false,
                onToggleCompare: () => {},
              })
            )
          );
          expect(html).toContain("Insufficient data");
          expect(html).toContain("Sparse Sample");
          resolve();
        }
      });
    });
  });
});
