import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

import { parsePhotonResponse } from "../src/engine/providers/geocoding/photon";
import { parseNominatimCityResponse } from "../src/engine/providers/geocoding/nominatim";
import {
  parseOverpassLocalities,
  buildOverpassLocalityQuery
} from "../src/engine/providers/localities/overpass";
import {
  haversineDistanceKm,
  normalizeLocalityName,
  deduplicateLocalities,
  rankAndSelectLocalities
} from "../src/engine/domain/geo";

describe("Geocoding & Locality Parsers (Recorded Fixtures)", () => {
  it("parses Photon typeahead responses from recorded fixture", () => {
    const fixturePath = path.resolve(process.cwd(), "fixtures/recorded/photon-koramangala.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const suggestions = parsePhotonResponse(raw);

    expect(suggestions.length).toBeGreaterThan(0);
    const first = suggestions[0];
    expect(first.name).toBe("Koramangala");
    expect(first.id).toMatch(/^node\/\d+$/);
    expect(typeof first.lat).toBe("number");
    expect(typeof first.lon).toBe("number");
    expect(first.lat).toBeCloseTo(12.9357, 3);
    expect(first.lon).toBeCloseTo(77.6241, 3);
    expect(first.state).toBe("Karnataka");
  });

  it("handles empty or malformed Photon payloads gracefully", () => {
    expect(parsePhotonResponse(null)).toEqual([]);
    expect(parsePhotonResponse({})).toEqual([]);
    expect(parsePhotonResponse({ features: [] })).toEqual([]);
  });

  it("parses Nominatim city resolution prioritizing administrative relations", () => {
    const fixturePath = path.resolve(process.cwd(), "fixtures/recorded/nominatim-bengaluru.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const resolved = parseNominatimCityResponse(raw);

    expect(resolved).not.toBeNull();
    expect(resolved?.osmType).toBe("relation");
    expect(resolved?.relationId).toBe(1942586);
    expect(resolved?.name).toBe("Delhi");
    expect(resolved?.lat).toBeCloseTo(28.6328, 3);
    expect(resolved?.lon).toBeCloseTo(77.2197, 3);
    expect(resolved?.sourceNote).toContain("Resolved to OSM administrative relation 1942586");
    expect(resolved?.boundingBox).toBeDefined();
    expect(resolved?.boundingBox?.length).toBe(4);
  });

  it("parses Nominatim city resolution falling back to node with exact bounding box (Pune)", () => {
    const fixturePath = path.resolve(process.cwd(), "fixtures/recorded/nominatim-pune.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const resolved = parseNominatimCityResponse(raw);

    expect(resolved).not.toBeNull();
    expect(resolved?.osmType).toBe("node");
    expect(resolved?.osmId).toBe(16174445);
    expect(resolved?.name).toBe("Pune");
    expect(resolved?.lat).toBeCloseTo(18.5214, 3);
    expect(resolved?.lon).toBeCloseTo(73.8545, 3);
    expect(resolved?.sourceNote).toContain("No administrative relation found; fell back to geocoder bounding box with no padding");
    expect(resolved?.boundingBox).toEqual([18.3613738, 18.6813738, 73.6945071, 74.0145071]);
  });

  it("builds correct Overpass locality query strings for relation, enclosing area, and bbox", () => {
    // 1. Relation area ID
    const q1 = buildOverpassLocalityQuery({
      name: "Bengaluru",
      osmType: "relation",
      osmId: 7902476,
      relationId: 7902476,
      lat: 12.97,
      lon: 77.59
    });
    expect(q1).toContain("area(3607902476)->.searchArea;");
    expect(q1).toContain('nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.searchArea);');

    // 2. Enclosing area ID
    const q2 = buildOverpassLocalityQuery({
      name: "Pune",
      osmType: "node",
      osmId: 16174445,
      enclosingAreaId: 3610351626,
      lat: 18.52,
      lon: 73.85
    });
    expect(q2).toContain("area(3610351626)->.searchArea;");

    // 3. Bounding box fallback
    const q3 = buildOverpassLocalityQuery({
      name: "Pune",
      osmType: "node",
      osmId: 16174445,
      boundingBox: [18.36, 18.68, 73.69, 74.01],
      lat: 18.52,
      lon: 73.85
    });
    expect(q3).toContain('nwr["place"~"^(suburb|neighbourhood|quarter)$"](18.36,73.69,18.68,74.01);');
  });

  it("parses Overpass locality elements extracting centroids and stable IDs", () => {
    const fixturePath = path.resolve(process.cwd(), "fixtures/recorded/overpass-locality-bengaluru.json");
    const raw = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));

    const candidates = parseOverpassLocalities(raw);

    expect(candidates.length).toBeGreaterThan(100);

    // Verify all candidates have valid names, IDs, coordinates
    for (const c of candidates) {
      expect(c.name).toBeTruthy();
      expect(c.id).toMatch(/^(node|way|relation)\/\d+$/);
      expect(typeof c.lat).toBe("number");
      expect(typeof c.lon).toBe("number");
      expect(isNaN(c.lat)).toBe(false);
      expect(isNaN(c.lon)).toBe(false);
    }

    // Verify way elements with center: { lat, lon } are extracted
    const ways = candidates.filter((c) => c.osmType === "way");
    expect(ways.length).toBeGreaterThan(0);
    const sampleWay = ways[0];
    expect(sampleWay.lat).toBeGreaterThan(12);
    expect(sampleWay.lon).toBeGreaterThan(77);
  });
});

describe("Geographic & Spatial Selection Utilities", () => {
  it("computes accurate Haversine distances", () => {
    // Bengaluru center (MG Road approx 12.9756, 77.6066) to Koramangala (approx 12.9357, 77.6241)
    const dist = haversineDistanceKm(12.9756, 77.6066, 12.9357, 77.6241);
    expect(dist).toBeGreaterThan(4.5);
    expect(dist).toBeLessThan(6.5);
  });

  it("normalizes locality names stripping administrative noise", () => {
    expect(normalizeLocalityName("Koramangala 4th Block")).toBe("koramangala 4th");
    expect(normalizeLocalityName("Indiranagar 1st Stage")).toBe("indiranagar 1st");
    expect(normalizeLocalityName("Domlur Layout")).toBe("domlur");
  });

  it("deduplicates candidates within 500m preferring relation > way > node", () => {
    const duplicates = [
      {
        id: "node/101",
        name: "Indiranagar",
        osmType: "node" as const,
        osmId: 101,
        lat: 12.9783,
        lon: 77.6408
      },
      {
        id: "way/202",
        name: "Indiranagar",
        osmType: "way" as const,
        osmId: 202,
        lat: 12.9785,
        lon: 77.6410
      },
      {
        id: "node/303",
        name: "Whitefield",
        osmType: "node" as const,
        osmId: 303,
        lat: 12.9698,
        lon: 77.7499
      }
    ];

    const deduped = deduplicateLocalities(duplicates, 0.5);
    expect(deduped.length).toBe(2);

    const indiranagar = deduped.find((d) => d.name === "Indiranagar");
    expect(indiranagar).toBeDefined();
    // Prioritizes way over node!
    expect(indiranagar?.osmType).toBe("way");
    expect(indiranagar?.id).toBe("way/202");
  });

  it("ranks candidates by distance to anchor and enforces candidate limit", () => {
    const anchor = { lat: 12.9716, lon: 77.5946 }; // City center

    const candidates = [
      { id: "node/1", name: "Far Locality", osmType: "node" as const, osmId: 1, lat: 13.1, lon: 77.7 },
      { id: "node/2", name: "Close Locality", osmType: "node" as const, osmId: 2, lat: 12.975, lon: 77.6 },
      { id: "node/3", name: "Mid Locality", osmType: "node" as const, osmId: 3, lat: 12.99, lon: 77.62 }
    ];

    const { selected, totalCandidates } = rankAndSelectLocalities(candidates, anchor, { limit: 2 });

    expect(totalCandidates).toBe(3);
    expect(selected.length).toBe(2);
    expect(selected[0].name).toBe("Close Locality");
    expect(selected[1].name).toBe("Mid Locality");
    expect(selected[0].distanceToAnchorKm).toBeLessThan(selected[1].distanceToAnchorKm!);
  });
});
