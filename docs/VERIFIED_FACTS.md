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
- **Policy & Fit:** Photon is explicitly designed for autocomplete/search-as-you-type based on OSM data. Safe for client-side typeahead.
- **Recorded Fixture:** `fixtures/recorded/photon-koramangala.json`

---

## 2. OpenStreetMap Nominatim (`https://nominatim.openstreetmap.org`)

- **Probe Script:** `scripts/probe/probe-nominatim.ts`
- **Probe Date:** 2026-10-04
- **Endpoint Tested:** `https://nominatim.openstreetmap.org/search?q={city}&format=jsonv2&polygon_geojson=1&addressdetails=1&extratags=1`
- **Reachability:** Verified reachable (~2200 ms with polite 1.2s delay).
- **CORS Behaviour:** `access-control-allow-origin: *` returned for browser origin.
- **Identification & Usage Policy:**
  - Strictly requires valid `User-Agent` identifying the application and contact email (`GEO_CONTACT` e.g. `locus.hackathon@gmail.com`).
  - Absolute rate limit of 1 request per second.
  - **Explicit policy rule:** Autocomplete/typeahead is strictly forbidden on OSM Nominatim. Nominatim must only be used on-submit to resolve the selected city.
- **City Resolution Reality:**
  - **Bengaluru:** Resolves to administrative relation (`osm_type: "relation"`, `osm_id: 7902476`, place_rank 14, category: "boundary", type: "administrative").
  - **Delhi:** Resolves to administrative relation (`osm_type: "relation"`, `osm_id: 1942586`, place_rank 8, category: "boundary", type: "administrative").
  - **Pune:** Top result is a node (`osm_type: "node"`, `osm_id: 16174445`, place_rank 16, category: "place", type: "city"), with `boundingbox: ["18.3613738", "18.6813738", "73.6945071", "74.0145071"]`.
- **Architectural Takeaway:** Cities do not always resolve to a relation. When `osm_type === "relation"`, Overpass is queried via area ID (`3600000000 + osm_id`). When `osm_type !== "relation"`, Overpass must fall back to the geocoder's exact bounding box with zero padding.
- **Recorded Fixtures:** `fixtures/recorded/nominatim-bengaluru.json`, `fixtures/recorded/nominatim-pune.json`

---

## 3. Overpass API Mirrors & Query Syntax

- **Probe Script:** `scripts/probe/probe-overpass.ts`
- **Probe Date:** 2026-10-04
- **Endpoint Tested:** `POST {base}/interpreter` with `data={query}` and `GET {base}/status`

### 3.1 Mirror Health & Status
| Mirror Base | Status | Slots Available | CORS | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `https://overpass-api.de/api` | **ALIVE** | 4 slots | `*` | Primary endpoint. Requires `User-Agent` (returns 406 if absent in Node fetch; browser fetch sends native User-Agent). |
| `https://z.overpass-api.de/api` | **ALIVE** | 4 slots | `*` | Reliable mirror. Same cluster. |
| `https://lz4.overpass-api.de/api` | **ALIVE** | 2 slots | `*` | Reliable mirror with 2 slots. |
| `https://overpass.kumi.systems/api` | **DEAD** | 0 | None | Timed out / blocked during probe. |
| `https://maps.mail.ru/osm/tools/overpass/api` | **DEAD** | 0 | None | Timed out / 504 Gateway Timeout during probe. |

### 3.2 Direct Browser Fetch vs Serverless Relay
- **Finding:** Every active Overpass mirror sends `access-control-allow-origin: *`.
- **Critical Architectural Fact:** A shared serverless relay funneling all client queries through a single server IP triggers rapid 429 rate-limiting and slot starvation (Overpass allows 2–4 slots per IP). Calling Overpass **directly from each client browser** leverages the individual user's residential IP, completely eliminating the shared bottleneck.
- **Decision:** Use direct browser requests from the client with mirror failover and local request queue spacing (≥ 700 ms).

### 3.3 Locality Discovery Query & Polygon Reality
- Tested query on Bengaluru relation area `3607902476`:
  ```overpass
  [out:json][timeout:25];
  area(3607902476)->.searchArea;
  (
    nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.searchArea);
  );
  out center;
  ```
- **Observed Result:** Returned 1,155 elements in 5,989 ms.
  - Distribution by OSM type: **1,060 nodes, 48 ways, 47 relations**.
  - **Fact:** 95 neighbourhoods in Bengaluru are mapped as polygons (ways and relations). A node-only query undercounts and drops key localities. Elements must be read via `lat ?? center.lat` and `lon ?? center.lon`.
- **Recorded Fixture:** `fixtures/recorded/overpass-locality-bengaluru.json`

### 3.4 Amenity Profile Query Syntax (Single-Request, Multi-Category)
- Tested single-request multi-category count query:
  ```overpass
  [out:json][timeout:20];
  nwr["amenity"~"^(hospital|clinic|pharmacy)$"](around:1500, 12.9352, 77.6245)->.health;
  nwr["amenity"~"^(school|college|kindergarten)$"](around:1500, 12.9352, 77.6245)->.education;
  nwr["shop"~"^(supermarket|convenience|grocery)$"](around:800, 12.9352, 77.6245)->.grocery;
  nwr["amenity"~"^(restaurant|cafe|fast_food)$"](around:800, 12.9352, 77.6245)->.food;
  nwr["leisure"~"^(park|garden|fitness_centre)$"](around:1500, 12.9352, 77.6245)->.leisure;
  nwr["highway"="bus_stop"](around:500, 12.9352, 77.6245)->.bus;
  nwr["railway"~"^(station|subway_entrance)$"](around:1500, 12.9352, 77.6245)->.rail;

  .health out count;
  .education out count;
  .grocery out count;
  .food out count;
  .leisure out count;
  .bus out count;
  .rail out count;
  ```
- **Observed Result:** Returned HTTP 200 in 2,343 ms.
  - Returned exactly 7 JSON elements with `type: "count"` and tags `{ nodes, ways, relations, total }`.
  - Element order strictly matches the order of `.setName out count;` execution.
  - Example counts observed at Koramangala: Health 79, Education 47, Grocery 23, Food 168, Leisure 58 (48 ways!), Bus 9, Rail 0.
- **Recorded Fixture:** `fixtures/recorded/overpass-amenity-counts.json`

---

## 4. OSRM Routing & Table Endpoints

- **Probe Script:** `scripts/probe/probe-osrm.ts`
- **Probe Date:** 2026-10-04

### 4.1 Host Reachability, Profiles, and CORS
| Host | Endpoint | Profile | Status | Latency | CORS | Code | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `router.project-osrm.org` | `/route/v1/{p}` | `driving` / `car` | 200 | 285–527 ms | `*` | `Ok` | Supported and active |
| `router.project-osrm.org` | `/route/v1/{p}` | `bike` / `bicycle` | 200 | 199–396 ms | `*` | `Ok` | Supported and active |
| `router.project-osrm.org` | `/route/v1/{p}` | `foot` / `walking` | 200 | 145–146 ms | `*` | `Ok` | Supported and active |
| `router.project-osrm.org` | `/table/v1/{p}` | `driving` / `car` | 200 | 150–156 ms | `*` | `Ok` | **Many-to-one batching verified!** |
| `routing.openstreetmap.de` | `/routed-car` | `driving` | 200 | 934 ms | `*` | `Ok` | Backup host verified |
| `routing.openstreetmap.de` | `/routed-bike` | `driving` (path) | 200 | 557 ms | `*` | `Ok` | Backup host verified |
| `routing.openstreetmap.de` | `/routed-foot` | `driving` (path) | 200 | 209 ms | `*` | `Ok` | Backup host verified |

### 4.2 Table Endpoint Performance
- 1 source (Manyata Tech Park) to 3 destinations (Koramangala, Indiranagar, Whitefield):
  - Request: `https://router.project-osrm.org/table/v1/driving/{coords}?sources=0`
  - Latency: **150 ms**
  - Durations returned: `[1307.7s, 916.9s, 1474.8s]` (~21.8 min, ~15.3 min, ~24.6 min free-flow).
- **Conclusion:** Batching 12 candidate localities against 1 primary anchor takes ~150 ms in a single table call, completely avoiding 12 sequential route requests.

---

## 5. Unverified / Heuristic Items Register

The following items cannot be directly measured from free live APIs without accounts or terms violations:

1. **Rent Market Prices:** `UNVERIFIED`. Indian listing portals (MagicBricks, 99acres, Housing, NoBroker) do not provide public unauthenticated APIs and forbid scraping. Rent will use the city-tier starter band table scaled by distance and amenity rank, tagged `source: "heuristic"`, `confidence: "low"`, with user override (`source: "user"`, `confidence: "high"`).
2. **Real-time Crime / Safety Data:** `UNVERIFIED`. There is no open public safety API for Indian municipal wards. Safety will be based strictly on OSM infrastructure indicators (police stations, lit ways, surveillance nodes) tagged `source: "osm"`, labelled "infrastructure indicator, not crime data", with confidence reduced when coverage is sparse.
3. **Public Transit Scheduling / GTFS:** `UNVERIFIED`. Real-time or static GTFS for Indian cities (BMTC, DMRC, PMPML) is fragmented or unavailable freely without authentication. Transit mode remains disabled or heuristic in Phase 1-8.
