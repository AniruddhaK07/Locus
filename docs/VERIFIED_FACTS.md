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

---

## 6. Phase 3 Locality Discovery & Geocoding Verification

- **Verification Date:** 2026-10-04
- **Verification Script:** `npm run smoke` (`scripts/smoke.ts`)
- **External Services Tested Live:** Photon (`https://photon.komoot.io/api`), Nominatim (`https://nominatim.openstreetmap.org`), Overpass API (`https://overpass-api.de/api`).

### 6.1 Metro City Discovery (Bengaluru)
- **Photon Suggestion:** Returned 5 suggestions in 1,058 ms (Top: `relation/7902476` at `[12.9768, 77.5901]`).
- **Nominatim City Resolution:** Resolved in 1,327 ms to administrative boundary relation `7902476` (BBMP), bounding box `[12.8335, 13.1426, 77.4599, 77.7841]`.
- **Overpass Locality Query:** Queried `area(3607902476)` for `nwr["place"~"^(suburb|neighbourhood|quarter)$"]`.
  - Discovered: **1,069 candidate localities** in 5,630 ms.
  - Selected Top 12 (ranked by distance to city anchor):
    1. Fair Field Layout (`node/7301358178`) at `[12.9854, 77.5863]` — 1.04 km
    2. Cubbonpet (`node/429921856`) at `[12.9685, 77.5852]` — 1.06 km
    3. D'Souza Layout (`node/10298313288`) at `[12.9696, 77.5968]` — 1.08 km
    4. Gandhinagar (`node/429697299`) at `[12.9772, 77.5800]` — 1.09 km
    5. Sampangirama Nagar (`node/428464052`) at `[12.9665, 77.5923]` — 1.17 km
    6. Shanthala Nagar (`node/459815995`) at `[12.9714, 77.5994]` — 1.18 km
    7. Sampangi Rama Nagara (`way/257906450`) at `[12.9652, 77.5921]` — 1.31 km (Polygonal centroid!)
    8. High Grounds (`node/665045361`) at `[12.9865, 77.5831]` — 1.32 km
    9. Ganigarpet (`node/4209390935`) at `[12.9668, 77.5833]` — 1.33 km
    10. Srikantan Layout (`node/12120352167`) at `[12.9881, 77.5820]` — 1.53 km
    11. Balepet (`node/429921863`) at `[12.9731, 77.5759]` — 1.59 km
    12. Mamulpete (`node/4209420893`) at `[12.9687, 77.5778]` — 1.60 km

### 6.2 Smaller / Node City Discovery (Pune)
- **Photon Suggestion:** Returned 5 suggestions in 1,237 ms (Top: `node/16174445` at `[18.5214, 73.8545]`).
- **Nominatim City Resolution:** Resolved in 1,018 ms to city node `16174445`. Bounding box fallback used with zero padding: `[18.3614, 18.6814, 73.6945, 74.0145]`.
- **Overpass Locality Query:** Queried bounding box for `nwr["place"~"^(suburb|neighbourhood|quarter)$"]`.
  - Discovered: **138 candidate localities** in 15,688 ms.
  - Selected Top 12 (ranked by distance to city anchor):
    1. Shaniwar Peth (`node/2266580379`) at `[18.5193, 73.8525]` — 0.32 km
    2. Kasba Peth (`node/245647083`) at `[18.5219, 73.8583]` — 0.40 km
    3. Mangalwar Peth (`node/2258420056`) at `[18.5243, 73.8592]` — 0.60 km
    4. Narayan Peth (`node/672156914`) at `[18.5156, 73.8511]` — 0.74 km
    5. Shukrawar Peth (`node/1645621271`) at `[18.5114, 73.8540]` — 1.12 km
    6. Somwar Peth (`node/1232209872`) at `[18.5221, 73.8652]` — 1.13 km
    7. Shivajinagar (`node/1229128806`) at `[18.5295, 73.8478]` — 1.14 km
    8. Guruwar Peth (`node/1645591500`) at `[18.5114, 73.8576]` — 1.16 km
    9. Sadashiv Peth (`node/2266580378`) at `[18.5108, 73.8502]` — 1.26 km
    10. Ganesh Peth (`node/245646887`) at `[18.5154, 73.8647]` — 1.27 km
    11. Deccan Gymkhana (`node/674076717`) at `[18.5159, 73.8412]` — 1.53 km
    12. Navi Peth (`node/245646635`) at `[18.5093, 73.8441]` — 1.73 km

### 6.3 Technical Takeaways
- Zero hardcoded localities or coordinates used.
- Stable IDs (`{type}/{id}`) reliably generated across nodes and ways.
- Centroids for polygon ways (`Sampangi Rama Nagara` `way/257906450`) accurately extracted via `center.lat` / `center.lon`.
- Spatial deduplication eliminates redundant records within 500m while preserving relation/way geometry over nodes.

---

## 7. Phase 4 Amenity Profile Verification

- **Verification Date:** 2026-10-04
- **Verification Suites:** `tests/amenities.test.ts` & `npm run smoke` (`scripts/smoke.ts`)
- **Query Strategy:** Single-request multi-category count query using named sets (`.set out count;`).

### 7.1 Cross-Check Against Manual Overpass Query (Koramangala, Bengaluru)
- **Coordinates:** `12.9352, 77.6245`
- **Recorded Fixture:** `fixtures/recorded/overpass-amenity-counts.json` (captured via `scripts/probe/probe-overpass.ts`)
- **Results:**
  - `healthcare`: **79** (nodes 76, ways 2, relations 1)
  - `education`: **47** (nodes 28, ways 16, relations 3)
  - `grocery`: **23** (nodes 22, ways 1, relations 0)
  - `food`: **168** (nodes 165, ways 3, relations 0)
  - `leisure`: **58** (nodes 10, ways 48, relations 0)
  - `busStops`: **9** (nodes 9, ways 0, relations 0)
  - `railStations`: **0** (nodes 0, ways 0, relations 0) — Real zero preserved with `source: "osm"`.
- **Polygon Undercount Proof:** Ways and relations contributed 19 elements in education (40.4% of total) and 48 elements in leisure (82.7% of total), proving `nwr` is indispensable compared to node-only queries.

### 7.2 Live Smoke Test Amenity Profiles
- **Fair Field Layout (Bengaluru):** Total mapped objects: **237**. Healthcare: 34, Education: 52, Grocery: 2, Food: 29, Leisure: 88, Bus: 11, Rail: 21, Police: 11, Lit roads: 83.
- **Shaniwar Peth (Pune):** Total mapped objects: **279**. Healthcare: 118, Education: 65, Grocery: 0, Food: 25, Leisure: 24, Bus: 15, Rail: 32, Police: 11, Lit roads: 51.

### 7.3 Radius Matching & Failure Isolation
- **Radius Invariant:** Verified that radii in `buildAmenityProfileQuery` strictly match `QUERY_RADII` in `src/engine/config/index.ts` and `MethodInfo.radii`:
  - Daily needs: 800m (grocery, food)
  - Bus stops: 500m
  - Institutions / Regional: 1500m (healthcare, education, leisure, railStations, safetyInfrastructure)
- **Failure Semantics:** Confirmed by unit test that failed requests produce explicit `null` with `source: "unavailable"` and descriptive `note`, never falling back to fake defaults or zero.

---

## 8. Phase 5 Commute Engine Verification

- **Verification Date:** 2026-10-04
- **Verification Suites:** `tests/commute.test.ts` & `npm run smoke` (`scripts/smoke.ts`)
- **Endpoints Used:** `https://routing.openstreetmap.de/routed-car/table/v1/driving/` with fallback to `https://router.project-osrm.org`.

### 8.1 Live Smoke Commute Test Outputs
1. **Bengaluru (Mega-Metro, $\alpha = 2.3$):**
   - Fair Field Layout $\rightarrow$ City Anchor: Free-flow **5m** (2.2 km), Peak **8m** (range: 7–9m)
   - Cubbonpet $\rightarrow$ City Anchor: Free-flow **4m** (2.0 km), Peak **6m** (range: 5–7m)
   - D'Souza Layout $\rightarrow$ City Anchor: Free-flow **5m** (1.7 km), Peak **7m** (range: 6–8m)
   - Gandhinagar $\rightarrow$ City Anchor: Free-flow **5m** (2.3 km), Peak **8m** (range: 7–9m)
   - Sampangirama Nagar $\rightarrow$ City Anchor: Free-flow **4m** (1.9 km), Peak **6m** (range: 5–7m)
   - Batch query duration: **1,812 ms** for 5 localities $\times$ 1 destination.

2. **Pune (Large Metro, $\alpha = 1.6$):**
   - Shaniwar Peth $\rightarrow$ City Anchor: Free-flow **1m** (0.5 km), Peak **1m** (range: 1–1m)
   - Kasba Peth $\rightarrow$ City Anchor: Free-flow **2m** (1.4 km), Peak **3m** (range: 3–3m)
   - Mangalwar Peth $\rightarrow$ City Anchor: Free-flow **2m** (1.3 km), Peak **2m** (range: 2–2m)
   - Narayan Peth $\rightarrow$ City Anchor: Free-flow **2m** (1.2 km), Peak **2m** (range: 2–2m)
   - Shukrawar Peth $\rightarrow$ City Anchor: Free-flow **2m** (1.5 km), Peak **3m** (range: 3–3m)
   - Batch query duration: **1,650 ms** for 5 localities $\times$ 1 destination.

### 8.2 Unverified Modes Verification
- Verified that `transit` mode is visibly disabled/unverified in v1:
  - `freeFlowMin: { value: null, source: "unavailable", confidence: "none", note: "Transit schedule routing is unverified in v1; public transit GTFS unavailable" }`
  - Zero fabricated transit numbers.




---

## 9. Phase 7 Live Pipeline & Engine Verification

- **Verification Date:** 2026-10-04
- **Verification Suites:** `tests/pipeline.test.ts` & `npm run smoke -- --city "Pune"`
- **Pipeline Implementation:** `SearchPipeline` (`src/engine/pipeline/searchPipeline.ts`) and `LiveEngine` (`src/engine/live/liveEngine.ts`).

### 9.1 Live End-to-End Smoke Test Output (Pune)
- **City Resolution:** Resolved `Pune` to OSM node `16174445` in **1,168 ms**, falling back to exact geocoder bounding box `[18.3614, 18.6814, 73.6945, 74.0145]` with zero padding.
- **Locality Discovery:** Overpass discovered **138 candidate localities** in **21,389 ms**; ranked by anchor proximity down to top 12.
- **Multi-Modal Commute:** OSRM batch routing routed all 12 localities in **1,743 ms** with alpha = 1.6 corridor calibration.
- **Amenity & Safety Profiling:** Profiled all 12 candidate localities live over Overpass API through rate-limiting queue (concurrency 1, spacing $\ge 750$ ms).
- **Multi-Criteria Scoring & Ranking:**
  - Total pipeline runtime: **131,579 ms** (~2.1 min) across 12 Overpass amenity queries.
  - Final Stage: `done` (12 localities ranked).
  - **#1 Narayan Peth:** Match: **91%**, Completeness: **100%**, Commute: **2m** peak. Facts: *2m peak car to Workplace · Strong family persona fit (7.9/10) · ₹40k–52k/mo (tier band estimate)*.
  - **#2 Sadashiv Peth:** Match: **89%**, Completeness: **100%**, Commute: **4m** peak. Facts: *4m peak car to Workplace · Strong family persona fit (7.7/10) · ₹32k–44k/mo (tier band estimate)*.
  - **#3 Deccan Gymkhana:** Match: **89%**, Completeness: **100%**, Commute: **4m** peak. Facts: *4m peak car to Workplace · Strong family persona fit (8.7/10) · ₹29k–41k/mo (tier band estimate)*.

### 9.2 Acceptance Findings
- Progressive state emissions: UI/subscribers receive stage updates (`resolving-city` $\rightarrow$ `discovering-localities` $\rightarrow$ `routing` $\rightarrow$ `profiling-amenities` (1..12) $\rightarrow$ `scoring` $\rightarrow$ `done`).
- Failure isolation: Per-locality query failure sets `null` metrics with reason and lowered `dataCompleteness` without halting pipeline.
- Abort handling: Cancelling a search cleanly aborts in-flight network requests and prevents stale updates.
- Re-hydration: `LiveEngine.getArea(id)` re-hydrates persisted `AreaDetail` records from `StorageAdapter` / IndexedDB.
- URL sharing: Preferences encode to query string and decode back to identical Preferences object.
