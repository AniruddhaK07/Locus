import type { AreaDetail, AreaSummary, PlaceSuggestion } from "../domain/types";

export const MOCK_PLACES: PlaceSuggestion[] = [
  { id: "city-bengaluru", name: "Bengaluru", city: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946, type: "city" },
  { id: "city-pune", name: "Pune", city: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567, type: "city" },
  { id: "city-delhi", name: "Delhi", city: "Delhi", state: "Delhi", lat: 28.6139, lon: 77.2090, type: "city" },
  { id: "place-koramangala", name: "Koramangala", city: "Bengaluru", district: "Bangalore South", state: "Karnataka", lat: 12.9352, lon: 77.6245, type: "suburb" },
  { id: "place-indiranagar", name: "Indiranagar", city: "Bengaluru", district: "Bangalore North", state: "Karnataka", lat: 12.9811, lon: 77.6444, type: "suburb" },
  { id: "place-whitefield", name: "Whitefield", city: "Bengaluru", district: "Bangalore East", state: "Karnataka", lat: 12.9698, lon: 77.7499, type: "suburb" },
  { id: "place-hsr", name: "HSR Layout", city: "Bengaluru", district: "Bangalore South", state: "Karnataka", lat: 12.9121, lon: 77.6446, type: "suburb" },
  { id: "work-manyata", name: "Manyata Tech Park", city: "Bengaluru", district: "Nagavara", state: "Karnataka", lat: 13.0489, lon: 77.6200, type: "office" },
  { id: "work-ecoworld", name: "RMZ Ecoworld", city: "Bengaluru", district: "Bellandur", state: "Karnataka", lat: 12.9234, lon: 77.6835, type: "office" },
  { id: "work-cybercity", name: "Cyber City", city: "Delhi", district: "Gurugram", state: "Haryana", lat: 28.4950, lon: 77.0895, type: "office" },
  { id: "work-hinjawadi", name: "Hinjawadi Phase 1", city: "Pune", district: "Mulshi", state: "Maharashtra", lat: 18.5927, lon: 73.7382, type: "office" }
];

export function createMockArea(
  id: string,
  name: string,
  lat: number,
  lon: number,
  rank: number,
  matchScore: number,
  opts: {
    freeFlowMin: number;
    peakMin: number;
    distanceKm: number;
    rentLow: number;
    rentHigh: number;
    healthCount: number;
    eduCount: number;
    groceryCount: number;
    foodCount: number;
    leisureCount: number;
    busCount: number;
    railCount: number;
    policeCount: number;
    litRoadsCount: number;
    surveillanceCount: number;
    isSparse?: boolean;
  }
): AreaDetail {
  const [osmTypeStr, osmIdStr] = id.split("/");
  const osmType = (osmTypeStr || "node") as "node" | "way" | "relation";
  const osmId = Number(osmIdStr) || 1000;

  if (opts.isSparse) {
    return {
      id,
      osmType,
      osmId,
      name: `${name} (Sparse Sample)`,
      lat,
      lon,
      rank,
      matchScore: Math.min(matchScore, 48),
      confidence: "low",
      dataCompleteness: 0.42,
      explanation: `${opts.peakMin} min peak estimate · sparse OSM tags for local amenities and safety indicators`,
      keyFacts: ["Commute measured", "Amenity data sparse", "Rent band estimated"],
      effectiveCommuteMin: {
        value: opts.peakMin,
        source: "heuristic",
        confidence: "low",
        note: "Peak heuristic formula applied"
      },
      rentBand: {
        value: { low: opts.rentLow, high: opts.rentHigh },
        source: "heuristic",
        confidence: "low",
        note: "Estimated city tier-band, not live listing data"
      },
      safetyIndicator: {
        value: null,
        source: "osm",
        confidence: "none",
        note: "Insufficient OSM streetlamp or police tagging in this sector"
      },
      amenitiesScore: {
        value: 3.2,
        source: "heuristic",
        confidence: "low",
        note: "Derived from partial relative category density"
      },
      amenities: {
        healthcare: { value: null, source: "unavailable", confidence: "none", note: "No healthcare mapped within 1500m" },
        education: { value: 1, source: "osm", confidence: "low" },
        grocery: { value: null, source: "unavailable", confidence: "none", note: "No grocery mapped within 800m" },
        food: { value: 4, source: "osm", confidence: "low" },
        leisure: { value: null, source: "unavailable", confidence: "none", note: "No parks mapped within 1500m" },
        busStops: { value: 2, source: "osm", confidence: "medium" },
        railStations: { value: 0, source: "osm", confidence: "high" }
      },
      commutes: [
        {
          destinationId: "primary",
          destinationLabel: "Workplace",
          freeFlowMin: { value: opts.freeFlowMin, source: "routing", confidence: "high" },
          peakEstimateMin: { value: opts.peakMin, source: "heuristic", confidence: "low", note: "Peak adjustment heuristic" },
          distanceKm: { value: opts.distanceKm, source: "routing", confidence: "high" },
          mode: "car",
          exceedsMax: opts.peakMin > 50
        }
      ],
      scoreBreakdown: [
        { name: "budget", points: 20, maxPoints: 28, effectiveWeight: 9.8, raw: { value: opts.rentHigh, source: "heuristic", confidence: "low" } },
        { name: "commute", points: 18, maxPoints: 27, effectiveWeight: 9.45, raw: { value: opts.peakMin, source: "heuristic", confidence: "low" } },
        { name: "safety", points: 0, maxPoints: 18, effectiveWeight: 0, raw: { value: null, source: "unavailable", confidence: "none", note: "Data missing" } },
        { name: "amenities", points: 4, maxPoints: 12, effectiveWeight: 4.2, raw: { value: 3.2, source: "heuristic", confidence: "low" } },
        { name: "transit", points: 4, maxPoints: 8, effectiveWeight: 5.6, raw: { value: 2, source: "osm", confidence: "medium" } },
        { name: "household", points: 2, maxPoints: 7, effectiveWeight: 2.45, raw: { value: null, source: "unavailable", confidence: "none" } }
      ],
      safetyDetails: {
        policeCount: { value: 0, source: "osm", confidence: "low" },
        litRoadsCount: { value: null, source: "unavailable", confidence: "none", note: "Lit tag absent on highway ways" },
        surveillanceCount: { value: 0, source: "osm", confidence: "low" },
        coverageNote: "OSM safety tags sparse in this quadrant."
      }
    };
  }

  return {
    id,
    osmType,
    osmId,
    name,
    lat,
    lon,
    rank,
    matchScore,
    confidence: matchScore >= 75 ? "high" : "medium",
    dataCompleteness: 0.94,
    explanation: `${opts.peakMin} min peak car commute · strong grocery (${opts.groceryCount}) & healthcare access (${opts.healthCount}) · rent band is an estimate`,
    keyFacts: [
      `${opts.peakMin} min peak commute (${opts.freeFlowMin} min free-flow)`,
      `${opts.foodCount} cafes & restaurants within 800m`,
      `Est. ₹${(opts.rentLow / 1000).toFixed(0)}k–₹${(opts.rentHigh / 1000).toFixed(0)}k/mo`
    ],
    effectiveCommuteMin: {
      value: opts.peakMin,
      source: "heuristic",
      confidence: "low",
      note: "Peak adjustment heuristic applied to free-flow routing"
    },
    rentBand: {
      value: { low: opts.rentLow, high: opts.rentHigh },
      source: "heuristic",
      confidence: "low",
      note: "City tier-band estimate scaled by locality rank, not live listing"
    },
    safetyIndicator: {
      value: Math.min(10, Math.round((opts.policeCount * 2 + opts.litRoadsCount / 5 + opts.surveillanceCount) * 10) / 10),
      source: "osm",
      confidence: "medium",
      note: "Infrastructure indicator: lit streets & police presence, not crime data"
    },
    amenitiesScore: {
      value: Math.round(Math.min(10, Math.log1p(opts.foodCount + opts.groceryCount) * 1.8) * 10) / 10,
      source: "osm",
      confidence: "high"
    },
    amenities: {
      healthcare: { value: opts.healthCount, source: "osm", confidence: "high" },
      education: { value: opts.eduCount, source: "osm", confidence: "high" },
      grocery: { value: opts.groceryCount, source: "osm", confidence: "high" },
      food: { value: opts.foodCount, source: "osm", confidence: "high" },
      leisure: { value: opts.leisureCount, source: "osm", confidence: "high" },
      busStops: { value: opts.busCount, source: "osm", confidence: "high" },
      railStations: { value: opts.railCount, source: "osm", confidence: "high" }
    },
    commutes: [
      {
        destinationId: "workplace",
        destinationLabel: "Workplace",
        freeFlowMin: { value: opts.freeFlowMin, source: "routing", confidence: "high" },
        peakEstimateMin: { value: opts.peakMin, source: "heuristic", confidence: "low", note: "alpha_city = 2.3" },
        distanceKm: { value: opts.distanceKm, source: "routing", confidence: "high" },
        mode: "car",
        exceedsMax: opts.peakMin > 45
      }
    ],
    scoreBreakdown: [
      { name: "budget", points: 26, maxPoints: 28, effectiveWeight: 28, raw: { value: (opts.rentLow + opts.rentHigh) / 2, source: "heuristic", confidence: "low" } },
      { name: "commute", points: Math.round(27 * Math.exp(-opts.peakMin / 45)), maxPoints: 27, effectiveWeight: 27, raw: { value: opts.peakMin, source: "heuristic", confidence: "low" } },
      { name: "safety", points: 15, maxPoints: 18, effectiveWeight: 18, raw: { value: 7.5, source: "osm", confidence: "medium" } },
      { name: "amenities", points: 11, maxPoints: 12, effectiveWeight: 12, raw: { value: 8.8, source: "osm", confidence: "high" } },
      { name: "transit", points: opts.railCount > 0 ? 8 : 5, maxPoints: 8, effectiveWeight: 8, raw: { value: opts.busCount, source: "osm", confidence: "high" } },
      { name: "household", points: 6, maxPoints: 7, effectiveWeight: 7, raw: { value: 8.5, source: "heuristic", confidence: "high" } }
    ],
    safetyDetails: {
      policeCount: { value: opts.policeCount, source: "osm", confidence: "high" },
      litRoadsCount: { value: opts.litRoadsCount, source: "osm", confidence: "medium" },
      surveillanceCount: { value: opts.surveillanceCount, source: "osm", confidence: "medium" },
      coverageNote: "Standard municipal infrastructure tagging observed."
    }
  };
}

export const MOCK_AREAS: AreaDetail[] = [
  createMockArea("node/429918282", "Koramangala", 12.9352, 77.6245, 1, 91, {
    freeFlowMin: 22, peakMin: 34, distanceKm: 16.2, rentLow: 28000, rentHigh: 75000,
    healthCount: 79, eduCount: 47, groceryCount: 23, foodCount: 168, leisureCount: 58,
    busCount: 9, railCount: 0, policeCount: 2, litRoadsCount: 84, surveillanceCount: 5
  }),
  createMockArea("relation/19883335", "Indiranagar", 12.9811, 77.6444, 2, 88, {
    freeFlowMin: 18, peakMin: 29, distanceKm: 12.5, rentLow: 32000, rentHigh: 85000,
    healthCount: 65, eduCount: 38, groceryCount: 28, foodCount: 192, leisureCount: 42,
    busCount: 14, railCount: 2, policeCount: 3, litRoadsCount: 112, surveillanceCount: 8
  }),
  createMockArea("way/88219472", "HSR Layout", 12.9121, 77.6446, 3, 85, {
    freeFlowMin: 26, peakMin: 38, distanceKm: 18.0, rentLow: 25000, rentHigh: 65000,
    healthCount: 52, eduCount: 35, groceryCount: 31, foodCount: 145, leisureCount: 64,
    busCount: 12, railCount: 0, policeCount: 2, litRoadsCount: 96, surveillanceCount: 4
  }),
  createMockArea("node/51298412", "Whitefield", 12.9698, 77.7499, 4, 82, {
    freeFlowMin: 32, peakMin: 44, distanceKm: 21.4, rentLow: 24000, rentHigh: 60000,
    healthCount: 45, eduCount: 30, groceryCount: 22, foodCount: 110, leisureCount: 35,
    busCount: 16, railCount: 3, policeCount: 2, litRoadsCount: 78, surveillanceCount: 3
  }),
  createMockArea("relation/9921841", "Jayanagar", 12.9308, 77.5838, 5, 80, {
    freeFlowMin: 25, peakMin: 36, distanceKm: 17.2, rentLow: 26000, rentHigh: 70000,
    healthCount: 70, eduCount: 42, groceryCount: 26, foodCount: 130, leisureCount: 72,
    busCount: 18, railCount: 1, policeCount: 3, litRoadsCount: 105, surveillanceCount: 6
  }),
  createMockArea("node/3819401", "Malleshwaram", 13.0031, 77.5701, 6, 78, {
    freeFlowMin: 19, peakMin: 28, distanceKm: 11.8, rentLow: 22000, rentHigh: 58000,
    healthCount: 58, eduCount: 33, groceryCount: 25, foodCount: 115, leisureCount: 38,
    busCount: 15, railCount: 2, policeCount: 2, litRoadsCount: 90, surveillanceCount: 4
  }),
  createMockArea("node/4910248", "Bellandur", 12.9234, 77.6835, 7, 76, {
    freeFlowMin: 27, peakMin: 41, distanceKm: 17.8, rentLow: 26000, rentHigh: 68000,
    healthCount: 41, eduCount: 24, groceryCount: 19, foodCount: 98, leisureCount: 28,
    busCount: 11, railCount: 0, policeCount: 1, litRoadsCount: 55, surveillanceCount: 2
  }),
  createMockArea("relation/8812041", "Electronic City", 12.8452, 77.6602, 8, 74, {
    freeFlowMin: 38, peakMin: 49, distanceKm: 26.5, rentLow: 18000, rentHigh: 45000,
    healthCount: 36, eduCount: 20, groceryCount: 17, foodCount: 85, leisureCount: 24,
    busCount: 20, railCount: 1, policeCount: 2, litRoadsCount: 68, surveillanceCount: 3
  }),
  createMockArea("node/7710291", "Hebbal", 13.0358, 77.5970, 9, 73, {
    freeFlowMin: 14, peakMin: 22, distanceKm: 6.2, rentLow: 25000, rentHigh: 65000,
    healthCount: 38, eduCount: 22, groceryCount: 16, foodCount: 76, leisureCount: 45,
    busCount: 14, railCount: 1, policeCount: 2, litRoadsCount: 72, surveillanceCount: 3
  }),
  createMockArea("node/6619204", "Banashankari", 12.9150, 77.5736, 10, 71, {
    freeFlowMin: 29, peakMin: 42, distanceKm: 19.5, rentLow: 20000, rentHigh: 50000,
    healthCount: 48, eduCount: 31, groceryCount: 24, foodCount: 88, leisureCount: 40,
    busCount: 16, railCount: 1, policeCount: 2, litRoadsCount: 65, surveillanceCount: 2
  }),
  createMockArea("node/5519401", "Yelahanka", 13.1007, 77.5963, 11, 68, {
    freeFlowMin: 24, peakMin: 33, distanceKm: 14.8, rentLow: 16000, rentHigh: 42000,
    healthCount: 28, eduCount: 19, groceryCount: 14, foodCount: 62, leisureCount: 32,
    busCount: 10, railCount: 1, policeCount: 1, litRoadsCount: 48, surveillanceCount: 1
  }),
  createMockArea("node/4419201", "Marathahalli", 12.9591, 77.6974, 12, 66, {
    freeFlowMin: 28, peakMin: 46, distanceKm: 18.2, rentLow: 21000, rentHigh: 55000,
    healthCount: 44, eduCount: 25, groceryCount: 21, foodCount: 125, leisureCount: 22,
    busCount: 18, railCount: 0, policeCount: 1, litRoadsCount: 60, surveillanceCount: 2
  })
];

export const MOCK_SPARSE_AREAS: AreaDetail[] = [
  createMockArea("node/9001", "Outskirt Sector A", 12.85, 77.50, 1, 46, {
    freeFlowMin: 45, peakMin: 65, distanceKm: 28.0, rentLow: 8000, rentHigh: 20000,
    healthCount: 0, eduCount: 1, groceryCount: 0, foodCount: 3, leisureCount: 0,
    busCount: 2, railCount: 0, policeCount: 0, litRoadsCount: 0, surveillanceCount: 0,
    isSparse: true
  }),
  createMockArea("node/9002", "Rural Fringe B", 12.80, 77.45, 2, 41, {
    freeFlowMin: 50, peakMin: 72, distanceKm: 32.0, rentLow: 7000, rentHigh: 18000,
    healthCount: 0, eduCount: 0, groceryCount: 0, foodCount: 1, leisureCount: 0,
    busCount: 1, railCount: 0, policeCount: 0, litRoadsCount: 0, surveillanceCount: 0,
    isSparse: true
  })
];

export function toAreaSummary(detail: AreaDetail): AreaSummary {
  return {
    id: detail.id,
    name: detail.name,
    lat: detail.lat,
    lon: detail.lon,
    rank: detail.rank,
    matchScore: detail.matchScore,
    confidence: detail.confidence,
    dataCompleteness: detail.dataCompleteness,
    explanation: detail.explanation,
    keyFacts: detail.keyFacts,
    effectiveCommuteMin: detail.effectiveCommuteMin,
    rentBand: detail.rentBand,
    safetyIndicator: detail.safetyIndicator,
    amenitiesScore: detail.amenitiesScore
  };
}
