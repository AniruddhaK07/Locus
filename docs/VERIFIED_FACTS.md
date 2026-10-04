# Locus — Verified Facts from Live Probes

All entries in this register were established via real network probes executed from `scripts/probe/` on **2026-10-04**. Real payload samples are saved in `fixtures/recorded/` with `fetchedAt` timestamps.

---

## 1. Photon Geocoding API (`https://photon.komoot.io`)

- **Probe Script:** `scripts/probe/probe-photon.ts`
- **Probe Date:** 2026-10-04
- **Endpoint Tested:** `https://photon.komoot.io/api/?q={query}&limit=5`
- **Reachability:** Verified reachable with fast response times (~180–280 ms for Indian locations like Indiranagar, Connaught Place, Hinjawadi; initial cold query ~2300 ms).
- **CORS Behaviour:** `access-control-allow-origin: *` returned when browser `Origin` header (e.g., `http://localhost:5173`) is supplied. Direct client-side browser requests succeed without proxy.
- **Response Shape (GeoJSON):**
  - Features array with `geometry.coordinates` `[lon, lat]` (Note: GeoJSON order is Longitude, Latitude).
  - Properties include: `osm_type` (`"N"` for node, `"R"` for relation, `"W"` for way), `osm_id`, `name`, `city`, `district`, `state`, `country`, `postcode`, `countrycode`.
  - Relation boundaries also provide an `extent` bounding box `[minLon, maxLat, maxLon, minLat]`.
- **Policy & Fit:** Explicitly designed for autocomplete/search-as-you-type based on OSM data. Safe for client-side typeahead.
- **Recorded Fixture:** `fixtures/recorded/photon-koramangala.json`

---

## 2. OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org`)

- **Probe Script:** `scripts/probe/probe-nominatim.ts`
- **Probe Date:** 2026-10-04
- **Endpoint Tested:** `https://nominatim.openstreetmap.org/search?q={city}&format=jsonv2&polygon_geojson=1&addressdetails=1&extratags=1`
- **Reachability:** Verified reachable (~2200 ms with polite 1.2s delay).
- **CORS Behaviour:** `access-control-allow-origin: *` returned for browser origin.
- **Identification Policy & Direct Browser Architecture:**
  - Nominatim asks for identification. In a direct browser environment, browsers forbid setting custom `User-Agent` headers.
  - Identification can be provided optionally via the `email` URL query parameter (`&email=...`) if configured, or omitted to let Nominatim identify traffic via the browser's `Referer` origin header.
  - Absolute rate limit: 1 request per second.
  - **Explicit policy rule:** Autocomplete/typeahead is strictly forbidden on OSM Nominatim. Nominatim must only be used on-submit to resolve the selected city.
- **City Resolution & Enclosing Admin Area Probe:**
  - **Bengaluru:** Resolves to administrative relation (`osm_type: "relation"`, `osm_id: 7902476`, place_rank 14).
  - **Delhi:** Resolves to administrative relation (`osm_type: "relation"`, `osm_id: 1942586`, place_rank 8).
  - **Pune:** Top result is a node (`osm_type: "node"`, `osm_id: 16174445`, place_rank 16, category: "place", type: "city"), with `boundingbox: ["18.3613738", "18.6813738", "73.6945071", "74.0145071"]`.
  - **Enclosing Admin Area Probe (`is_in`):** Probed Overpass `is_in(18.5214, 73.8545)` for Pune. Found 5 enclosing boundaries, including `Pune City Subdistrict` (relation `3610351626`, `admin_level: 6`). Querying localities within this enclosing area returned 82 localities (Katraj, Swargate, Dattawadi, etc.).
  - **Resolution Strategy:** If city resolves to an administrative relation, use area ID `3600000000 + osm_id`. If it resolves to a node, probe enclosing administrative boundary via `is_in` or fall back to the exact geocoder bounding box with zero padding.
- **Recorded Fixtures:** `fixtures/recorded/nominatim-bengaluru.json`, `fixtures/recorded/nominatim-pune.json`

---

## 3. Overpass API Mirrors & Query Syntax

- **Probe Scripts:** `scripts/probe/probe-overpass.ts`, `scripts/probe/probe-independent-overpass.ts`
- **Probe Date:** 2026-10-04

### 3.1 Mirror Independence & Status
- **Roland Olbricht Cluster (`overpass-api.de`, `z.overpass-api.de`, `lz4.overpass-api.de`):**
  - All three returned HTTP 200 with `CORS: *`.
  - **Independence Reality:** They announce identical backend backplanes (`gall.openstreetmap.de` / `lambert.openstreetmap.de`) and share the same client IP rate limit connection ID (`74182843`). They are **NOT** independent in practice; an IP rate limit hit on one affects all three.
- **Independent Public Mirrors Probed:**
  - `https://overpass.kumi.systems/api`: Returned 504 Gateway Timeout during probes.
  - `https://maps.mail.ru/osm/tools/overpass/api`: Returned 504 Gateway Timeout during probes.
  - `https://overpass.openstreetmap.fr/api`: Returned 403 Forbidden to cross-origin requests.
  - `https://overpass.private.coffee/api`: Timed out during probes.
- **Observed Rate-Limit Behaviour:**
  - Overpass allocates 2 to 4 simultaneous query slots per IP.
  - When all slots are busy, Overpass responds with HTTP 429 or status text stating wait time in seconds (`Slot available after ... seconds`).
  - Spacing requests with ≥ 700 ms and keeping client concurrency to 1 is essential.

### 3.2 Locality Discovery & Polygon Proportion
- Tested query on Bengaluru relation area `3607902476`:
  Returned 1,155 elements: 1,060 nodes, 48 ways, 47 relations.
- **Correction on Polygons:** Polygons accounted for 95 of 1,155 elements (~8.2%). While including `way` and `relation` ensures prominent polygonal neighbourhoods are not lost, **the primary engineering challenge is not polygon extraction, but ranking, pre-filtering by distance, and selecting the top $N=12$ candidates**.
- **Recorded Fixture:** `fixtures/recorded/overpass-locality-bengaluru.json`

### 3.3 Amenity Profile Query Syntax (Single-Request Multi-Category)
- Tested single-request multi-category count query with named sets (`.set out count;`).
- Returned HTTP 200 in 2,343 ms with exactly 7 count elements corresponding to each named category set.
- **Recorded Fixture:** `fixtures/recorded/overpass-amenity-counts.json`

---

## 4. OSRM Routing Profiles & Table Endpoints

- **Probe Scripts:** `scripts/probe/probe-osrm.ts`, `scripts/probe/probe-osrm-profiles.ts`
- **Probe Date:** 2026-10-04

### 4.1 Demo Host Profile Deception (`router.project-osrm.org`)
- **Crucial Finding:** When routing the exact same origin (Manyata) and destination (Koramangala):
  - `driving`: 1307.7s (17,962.6m)
  - `car`: 1307.7s (17,962.6m)
  - `bike`: 1307.7s (17,962.6m) — **Identical**
  - `foot`: 1307.7s (17,962.6m) — **Identical**
- **Conclusion:** The public demo host `router.project-osrm.org` completely ignores the bike and foot profile parameters and always routes via the driving engine. **Bike and foot are UNVERIFIED on `router.project-osrm.org`**.
- **OSRM Demo Server Usage Policy:** Provided strictly for demonstration and testing. No SLA, strict rate limits, and subject to blocking on high traffic.

### 4.2 Verified Multi-Modal Host (`routing.openstreetmap.de`)
- Probing `routing.openstreetmap.de` with separate dedicated endpoints:
  - `routed-car`: duration = **1307.7s** (~21.8 min), distance = 17,962.6m, `CORS: *`, table duration = `1307.7s`
  - `routed-bike`: duration = **4089.5s** (~68.2 min), distance = 15,762.8m, `CORS: *`, table duration = `4089.5s`
  - `routed-foot`: duration = **12272.2s** (~204.5 min), distance = 15,332.2m, `CORS: *`, table duration = `12272.2s`
- **Decision:** Use `routing.openstreetmap.de` with its dedicated endpoints (`routed-car`, `routed-bike`, `routed-foot`) for authentic multi-modal routing. Both route and table endpoints return valid distinct durations and full `CORS: *`.
- `engine.method()` will report `car`, `bike`, and `walk` as available and backed by verified distinct OSM routing profiles.

---

## 5. Unverified / Heuristic Items Register

1. **Rent Market Prices:** `UNVERIFIED`. Public Indian real estate portals do not offer open unauthenticated APIs. Handled via starter tier-band heuristic scaled by accessibility + user override.
2. **Real-time Crime / Safety Data:** `UNVERIFIED`. No public ward-level crime API in India. Safety is measured solely via OSM infrastructure indicator tags (police stations, lit ways, surveillance nodes), labelled "infrastructure indicator, not crime data".
3. **Public Transit Real-time GTFS:** `UNVERIFIED`. Public transit schedules/GTFS are fragmented. Transit mode remains disabled or heuristic in Phase 1-8.
