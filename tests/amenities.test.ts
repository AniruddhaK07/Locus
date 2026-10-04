import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  parseAmenityResponse,
  buildAmenityProfileQuery,
  buildBatchAmenityProfileQuery,
  parseBatchAmenityResponse,
  computeLocalitiesBoundingBox,
  buildEnvelopeAmenityQuery,
  parseEnvelopeAmenityResponse,
  createUnavailableProfile
} from "../src/engine/providers/amenities/overpass";
import { normalizeAmenityProfiles } from "../src/engine/scoring/amenityScores";
import { QUERY_RADII } from "../src/engine/config";
import { MockEngine } from "../src/engine/mock/mockEngine";
import type { AmenityCounts } from "../src/engine/domain/types";

describe("Overpass Amenity Profile Provider & Parser", () => {
  it("parses single-request multi-category count response from recorded fixture", () => {
    const fixturePath = path.resolve(process.cwd(), "fixtures/recorded/overpass-amenity-counts.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const result = parseAmenityResponse(raw);

    // Cross-check against recorded probe counts:
    // health: 79, education: 47, grocery: 23, food: 168, leisure: 58, bus: 9, rail: 0
    expect(result.amenities.healthcare.value).toBe(79);
    expect(result.amenities.healthcare.source).toBe("osm");
    expect(result.amenities.healthcare.confidence).toBe("high");

    expect(result.amenities.education.value).toBe(47);
    expect(result.amenities.education.source).toBe("osm");

    expect(result.amenities.grocery.value).toBe(23);
    expect(result.amenities.grocery.source).toBe("osm");

    expect(result.amenities.food.value).toBe(168);
    expect(result.amenities.food.source).toBe("osm");

    expect(result.amenities.leisure.value).toBe(58);
    expect(result.amenities.leisure.source).toBe("osm");

    expect(result.amenities.busStops.value).toBe(9);
    expect(result.amenities.busStops.source).toBe("osm");

    // Real zero test: rail stations count = 0 must be value: 0, source: "osm", NOT null
    expect(result.amenities.railStations.value).toBe(0);
    expect(result.amenities.railStations.source).toBe("osm");
    expect(result.amenities.railStations.confidence).toBe("high");

    // Total mapped objects
    expect(result.totalMappedObjects).toBe(79 + 47 + 23 + 168 + 58 + 9 + 0);
  });

  it("produces explicit null + reason on network or query failure", () => {
    const reason = "Overpass query timed out (504)";
    const unavailable = createUnavailableProfile(reason);

    for (const key of Object.keys(unavailable.amenities) as (keyof AmenityCounts)[]) {
      expect(unavailable.amenities[key].value).toBeNull();
      expect(unavailable.amenities[key].source).toBe("unavailable");
      expect(unavailable.amenities[key].confidence).toBe("none");
      expect(unavailable.amenities[key].note).toBe(reason);
    }

    expect(unavailable.safety.policeCount.value).toBeNull();
    expect(unavailable.safety.litRoadsCount.value).toBeNull();
    expect(unavailable.safety.surveillanceCount.value).toBeNull();
    expect(unavailable.totalMappedObjects).toBe(0);
  });

  it("strictly enforces that radii in buildAmenityProfileQuery equal QUERY_RADII and MethodInfo", () => {
    const coords = { lat: 12.9352, lon: 77.6245 };
    const query = buildAmenityProfileQuery(coords);
    const methodRadii = new MockEngine().method().radii;

    // Verify exact matches between query string, config, and MethodInfo
    expect(query).toContain(`around:${QUERY_RADII.healthcare}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.healthcare).toBe(1500);
    expect(methodRadii.healthcare).toBe(QUERY_RADII.healthcare);

    expect(query).toContain(`around:${QUERY_RADII.education}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.education).toBe(1500);
    expect(methodRadii.education).toBe(QUERY_RADII.education);

    expect(query).toContain(`around:${QUERY_RADII.grocery}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.grocery).toBe(800);
    expect(methodRadii.grocery).toBe(QUERY_RADII.grocery);

    expect(query).toContain(`around:${QUERY_RADII.food}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.food).toBe(800);
    expect(methodRadii.food).toBe(QUERY_RADII.food);

    expect(query).toContain(`around:${QUERY_RADII.leisure}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.leisure).toBe(1500);
    expect(methodRadii.leisure).toBe(QUERY_RADII.leisure);

    expect(query).toContain(`around:${QUERY_RADII.busStops}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.busStops).toBe(500);
    expect(methodRadii.busStops).toBe(QUERY_RADII.busStops);

    expect(query).toContain(`around:${QUERY_RADII.railStations}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.railStations).toBe(1500);
    expect(methodRadii.railStations).toBe(QUERY_RADII.railStations);

    expect(query).toContain(`around:${QUERY_RADII.safetyInfrastructure}, ${coords.lat}, ${coords.lon}`);
    expect(QUERY_RADII.safetyInfrastructure).toBe(1500);
    expect(methodRadii.safetyInfrastructure).toBe(QUERY_RADII.safetyInfrastructure);
  });
});

describe("Amenity Relative Normalization & Scoring", () => {
  it("normalizes category scores relatively across >= 5 candidates using log1p min-max", () => {
    const makeCounts = (grocery: number, food: number): AmenityCounts => ({
      healthcare: { value: 10, source: "osm", confidence: "high" },
      education: { value: 5, source: "osm", confidence: "high" },
      grocery: { value: grocery, source: "osm", confidence: "high" },
      food: { value: food, source: "osm", confidence: "high" },
      leisure: { value: 8, source: "osm", confidence: "high" },
      busStops: { value: 4, source: "osm", confidence: "high" },
      railStations: { value: 1, source: "osm", confidence: "high" }
    });

    const candidates = [
      makeCounts(2, 5),
      makeCounts(8, 20),
      makeCounts(15, 50),
      makeCounts(25, 90),
      makeCounts(40, 150)
    ];

    const results = normalizeAmenityProfiles(candidates);
    expect(results.length).toBe(5);

    // Candidate 0 has lowest grocery (2) -> relative score 0.0
    expect(results[0].categoryScores.grocery.value).toBe(0);
    // Candidate 4 has highest grocery (40) -> relative score 10.0
    expect(results[4].categoryScores.grocery.value).toBe(10);
    // Intermediate candidates strictly monotonic
    expect(results[1].categoryScores.grocery.value!).toBeGreaterThan(results[0].categoryScores.grocery.value!);
    expect(results[2].categoryScores.grocery.value!).toBeGreaterThan(results[1].categoryScores.grocery.value!);
    expect(results[3].categoryScores.grocery.value!).toBeGreaterThan(results[2].categoryScores.grocery.value!);
    expect(results[4].categoryScores.grocery.value!).toBeGreaterThan(results[3].categoryScores.grocery.value!);

    // Check blended amenitiesScore is computed in [0, 10]
    for (const res of results) {
      expect(res.amenitiesScore.value).toBeGreaterThanOrEqual(0);
      expect(res.amenitiesScore.value).toBeLessThanOrEqual(10);
      expect(res.transitAccessScore.value).toBeGreaterThanOrEqual(0);
      expect(res.transitAccessScore.value).toBeLessThanOrEqual(10);
    }
  });

  it("falls back to absolute reference ceiling when < 5 candidates exist", () => {
    const makeCounts = (grocery: number): AmenityCounts => ({
      healthcare: { value: 10, source: "osm", confidence: "high" },
      education: { value: 5, source: "osm", confidence: "high" },
      grocery: { value: grocery, source: "osm", confidence: "high" },
      food: { value: 10, source: "osm", confidence: "high" },
      leisure: { value: 5, source: "osm", confidence: "high" },
      busStops: { value: 2, source: "osm", confidence: "high" },
      railStations: { value: 0, source: "osm", confidence: "high" }
    });

    const twoCandidates = [makeCounts(5), makeCounts(15)];
    const results = normalizeAmenityProfiles(twoCandidates);

    expect(results.length).toBe(2);
    expect(results[0].categoryScores.grocery.note).toBe("calibrated to reference ceiling");
    expect(results[1].categoryScores.grocery.value).toBe(10); // 15 equals grocery reference ceiling
  });

  it("handles null counts without default substitution", () => {
    const sparseProfile: AmenityCounts = {
      healthcare: { value: null, source: "unavailable", confidence: "none", note: "timeout" },
      education: { value: null, source: "unavailable", confidence: "none", note: "timeout" },
      grocery: { value: 5, source: "osm", confidence: "medium" },
      food: { value: null, source: "unavailable", confidence: "none", note: "timeout" },
      leisure: { value: null, source: "unavailable", confidence: "none", note: "timeout" },
      busStops: { value: null, source: "unavailable", confidence: "none", note: "timeout" },
      railStations: { value: null, source: "unavailable", confidence: "none", note: "timeout" }
    };

    const results = normalizeAmenityProfiles([sparseProfile]);
    expect(results[0].categoryScores.healthcare.value).toBeNull();
    expect(results[0].categoryScores.healthcare.source).toBe("unavailable");
    expect(results[0].categoryScores.grocery.value).not.toBeNull();
    // Transit access is null when both busStops and railStations are null
    expect(results[0].transitAccessScore.value).toBeNull();
  });

  it("builds combined batch query for up to 4 localities with named sets and counts", () => {
    const locs = [
      { lat: 28.6318, lon: 77.2194 },
      { lat: 28.6335, lon: 77.2236 }
    ];
    const query = buildBatchAmenityProfileQuery(locs);

    expect(query).toContain(".health_0");
    expect(query).toContain(".health_1");
    expect(query).toContain(".police_0");
    expect(query).toContain(".police_1");
    expect(query).toContain(".health_0 out count;");
    expect(query).toContain(".health_1 out count;");
  });

  it("parses batch Overpass count responses into separate locality profiles", () => {
    // 2 localities * 10 counts = 20 count elements
    const mockElements = [
      // Locality 0:
      { type: "count", id: 0, tags: { total: "15" } }, // health
      { type: "count", id: 0, tags: { total: "10" } }, // education
      { type: "count", id: 0, tags: { total: "8" } },  // grocery
      { type: "count", id: 0, tags: { total: "40" } }, // food
      { type: "count", id: 0, tags: { total: "12" } }, // leisure
      { type: "count", id: 0, tags: { total: "5" } },  // bus
      { type: "count", id: 0, tags: { total: "2" } },  // rail
      { type: "count", id: 0, tags: { total: "3" } },  // police
      { type: "count", id: 0, tags: { total: "14" } }, // lit
      { type: "count", id: 0, tags: { total: "1" } },  // surv
      // Locality 1:
      { type: "count", id: 0, tags: { total: "5" } },  // health
      { type: "count", id: 0, tags: { total: "2" } },  // education
      { type: "count", id: 0, tags: { total: "1" } },  // grocery
      { type: "count", id: 0, tags: { total: "10" } }, // food
      { type: "count", id: 0, tags: { total: "3" } },  // leisure
      { type: "count", id: 0, tags: { total: "1" } },  // bus
      { type: "count", id: 0, tags: { total: "0" } },  // rail
      { type: "count", id: 0, tags: { total: "1" } },  // police
      { type: "count", id: 0, tags: { total: "4" } },  // lit
      { type: "count", id: 0, tags: { total: "0" } }   // surv
    ];

    const profiles = parseBatchAmenityResponse({ elements: mockElements }, 2);
    expect(profiles).toHaveLength(2);

    // Check locality 0
    expect(profiles[0].amenities.healthcare.value).toBe(15);
    expect(profiles[0].amenities.food.value).toBe(40);
    expect(profiles[0].safety.policeCount.value).toBe(3);

    // Check locality 1
    expect(profiles[1].amenities.healthcare.value).toBe(5);
    expect(profiles[1].amenities.food.value).toBe(10);
    expect(profiles[1].amenities.railStations.value).toBe(0);
    expect(profiles[1].safety.policeCount.value).toBe(1);
  });

  it("computes locality bounding box area and builds envelope query", () => {
    const locs = [
      { lat: 28.6318, lon: 77.2194 },
      { lat: 28.6482, lon: 77.2154 }
    ];
    const { bbox, areaKm2 } = computeLocalitiesBoundingBox(locs, 2.0);

    expect(bbox).toHaveLength(4);
    expect(bbox[0]).toBeLessThan(bbox[2]); // south < north
    expect(bbox[1]).toBeLessThan(bbox[3]); // west < east
    expect(areaKm2).toBeGreaterThan(0);
    expect(areaKm2).toBeLessThan(100);

    const envQuery = buildEnvelopeAmenityQuery(bbox);
    expect(envQuery).toContain("out center tags;");
  });

  it("parses envelope amenity response with local spatial binning", () => {
    const locs = [
      { id: "cp", lat: 28.6318, lon: 77.2194 },
      { id: "pahar", lat: 28.6415, lon: 77.2141 }
    ];

    const mockElements = [
      // Hospital near Connaught Place (~100m away)
      { type: "node", id: 1, lat: 28.632, lon: 77.2195, tags: { amenity: "hospital" } },
      // Restaurant near Paharganj (~100m away)
      { type: "node", id: 2, lat: 28.6416, lon: 77.2142, tags: { amenity: "restaurant" } },
      // Supermarket near Connaught Place (~200m away)
      { type: "node", id: 3, lat: 28.633, lon: 77.2196, tags: { shop: "supermarket" } }
    ];

    const map = parseEnvelopeAmenityResponse({ elements: mockElements }, locs);
    expect(map.size).toBe(2);

    const cpProfile = map.get("cp");
    expect(cpProfile).toBeDefined();
    expect(cpProfile?.amenities.healthcare.value).toBe(1);
    expect(cpProfile?.amenities.grocery.value).toBe(1);

    const paharProfile = map.get("pahar");
    expect(paharProfile).toBeDefined();
    expect(paharProfile?.amenities.food.value).toBe(1);
  });
});
