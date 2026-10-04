import { describe, it, expect } from "vitest";
import { selectAreas, AreaSummary } from "../src/engine";

describe("selectAreas pure function", () => {
  const sampleAreas: AreaSummary[] = [
    {
      id: "node/1",
      name: "Locality A",
      lat: 12.9,
      lon: 77.6,
      rank: 1,
      matchScore: 90,
      confidence: "high",
      dataCompleteness: 0.9,
      explanation: "Test",
      keyFacts: ["Fact 1"],
      effectiveCommuteMin: { value: 30, source: "routing", confidence: "high" },
      rentBand: { value: { low: 25000, high: 60000 }, source: "heuristic", confidence: "low" },
      safetyIndicator: { value: 8, source: "osm", confidence: "high" },
      amenitiesScore: { value: 9, source: "osm", confidence: "high" }
    },
    {
      id: "node/2",
      name: "Locality B",
      lat: 12.91,
      lon: 77.61,
      rank: 2,
      matchScore: 80,
      confidence: "medium",
      dataCompleteness: 0.8,
      explanation: "Test",
      keyFacts: ["Fact 2"],
      effectiveCommuteMin: { value: 20, source: "routing", confidence: "high" },
      rentBand: { value: { low: 30000, high: 70000 }, source: "heuristic", confidence: "low" },
      safetyIndicator: { value: 7, source: "osm", confidence: "medium" },
      amenitiesScore: { value: 7, source: "osm", confidence: "medium" }
    },
    {
      id: "node/3",
      name: "Locality C",
      lat: 12.92,
      lon: 77.62,
      rank: 3,
      matchScore: 70,
      confidence: "low",
      dataCompleteness: 0.5,
      explanation: "Test",
      keyFacts: ["Fact 3"],
      effectiveCommuteMin: { value: 50, source: "heuristic", confidence: "low" },
      rentBand: { value: { low: 15000, high: 40000 }, source: "heuristic", confidence: "low" },
      safetyIndicator: { value: null, source: "unavailable", confidence: "none" },
      amenitiesScore: { value: 5, source: "heuristic", confidence: "low" }
    }
  ];

  it("filters by maxCommuteMin", () => {
    const res = selectAreas(sampleAreas, { filters: { maxCommuteMin: 35 } });
    expect(res.length).toBe(2);
    expect(res.map((a) => a.id)).toEqual(["node/1", "node/2"]);
  });

  it("filters by minMatchScore", () => {
    const res = selectAreas(sampleAreas, { filters: { minMatchScore: 85 } });
    expect(res.length).toBe(1);
    expect(res[0]?.id).toBe("node/1");
  });

  it("filters out low confidence data", () => {
    const res = selectAreas(sampleAreas, { filters: { hideLowConfidence: true } });
    expect(res.length).toBe(2);
    expect(res.find((a) => a.id === "node/3")).toBeUndefined();
  });

  it("sorts by commute time ascending", () => {
    const res = selectAreas(sampleAreas, { sort: "commute" });
    expect(res.map((a) => a.id)).toEqual(["node/2", "node/1", "node/3"]);
  });

  it("sorts by rent band low ascending", () => {
    const res = selectAreas(sampleAreas, { sort: "rent" });
    expect(res.map((a) => a.id)).toEqual(["node/3", "node/1", "node/2"]);
  });

  it("sorts by amenities density descending", () => {
    const res = selectAreas(sampleAreas, { sort: "amenities" });
    expect(res.map((a) => a.id)).toEqual(["node/1", "node/2", "node/3"]);
  });

  it("paginates with limit and offset", () => {
    const res = selectAreas(sampleAreas, { sort: "match", limit: 2, offset: 1 });
    expect(res.length).toBe(2);
    expect(res.map((a) => a.id)).toEqual(["node/2", "node/3"]);
  });

  it("does not mutate original array", () => {
    const originalOrder = sampleAreas.map((a) => a.id);
    selectAreas(sampleAreas, { sort: "commute" });
    expect(sampleAreas.map((a) => a.id)).toEqual(originalOrder);
  });
});
