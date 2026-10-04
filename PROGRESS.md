# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 4 complete — starting Phase 5 (Commute engine).
- **Done in Phase 4:**
  - Implemented `OverpassAmenityProvider` (`src/engine/providers/amenities/overpass.ts`) using a unified single-request Overpass QL query with named sets (`.set out count;`).
  - Added real counts for 7 amenity categories (healthcare, education, grocery, food, leisure, busStops, railStations) and 3 safety categories (police, litRoads, surveillance).
  - Enforced strict null-vs-zero semantics: network/query failures yield `value: null, source: "unavailable", note: "<reason>"`; empty counts yield `value: 0, source: "osm"`.
  - Implemented relative normalization (`log1p` + min-max across candidate set) with reference saturation ceilings for $< 5$ candidates in `src/engine/scoring/amenityScores.ts`.
  - Implemented density coverage indicator downweighting confidence when local OSM mapping is sparse.
  - Created unit test suite `tests/amenities.test.ts` (6 tests) verifying parsing of recorded fixture `overpass-amenity-counts.json`, failure isolation, and exact radius invariant matching `QUERY_RADII` and `MethodInfo`.
  - Extended live smoke script `scripts/smoke.ts` to profile amenities live for Bengaluru (Fair Field Layout: 237 objects) and Pune (Shaniwar Peth: 279 objects).
  - Verified `npm run check` passes 100% (48 unit tests across 6 test suites).
- **In progress:** Phase 5 — Commute engine.
- **Phase 5 Plan (5–10 lines):**
  1. Implement `OsrmRoutingProvider` in `src/engine/providers/routing/osrm.ts` querying multi-modal endpoints on `routing.openstreetmap.de` (`routed-car`, `routed-bike`, `routed-foot`).
  2. Implement OSRM `/table` batching for many-to-one travel times (localities to primary workplace and secondary destinations).
  3. Implement peak commute heuristic: $T_{peak} = T_{freeflow} \times (1 + \alpha_{city} \times (1 - \exp(-d/8)))$.
  4. Implement city tier lookup based on geocoder normalized city/district fields mapping to $\alpha_{city}$ tiers (`CITY_TIER_ALPHAS`).
  5. Report free-flow (`source: "routing"`) and peak range (`source: "heuristic"`, `confidence: "low"`).
  6. Support multiple destinations with weighted blending: $0.7 \times \text{primary} + 0.3 \times \text{mean}(\text{extras})$.
  7. Create `docs/CALIBRATION.md` for ground-truth commute calibration observations.
  8. Write unit tests in `tests/commute.test.ts` and verify multi-modal live routing in smoke script.
  9. Run `npm run check`, commit `phase(4): Amenity profile`, tag `phase-4`, and push.
- **How to check:**
  ```bash
  npm run check
  npm run smoke
  ```
- **Known gaps:**
  - Multi-modal routing uses `routing.openstreetmap.de` (car, bike, foot verified; demo host `router.project-osrm.org` only supports driving).
  - Overpass mirrors from the Roland Olbricht cluster share the same IP slot pool; request rate must be queued with ≥ 700 ms spacing and concurrency 1.
  - When city resolves to a node (like Pune), either `is_in` enclosing boundary or exact geocoder bounding box fallback is used.
  - Transit mode (metro/bus schedule routing) is unverified and disabled in v1.
  - Rent data from listing portals is unavailable via unauthenticated API; starter tier-band heuristic + user override is used.

---

## Project Metadata

- **Start Timestamp:** `2026-10-04T10:41:19+05:30`
- **Phase 0 Completed:** `2026-10-04T11:08:30+05:30`
- **Phase 1 Completed:** `2026-10-04T11:43:00+05:30`
- **Phase 2 Completed:** `2026-10-04T12:05:00+05:30`
- **Phase 3 Completed:** `2026-10-04T12:32:00+05:30`
- **Phase 4 Completed:** `2026-10-04T12:46:00+05:30`
- **Repository:** `https://github.com/AniruddhaK07/Locus.git`

---

## Phase Overview

| Phase | Title | Budget | Status | Completed At |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Bootstrap and verification | 1.5 h | **DONE** | 2026-10-04T11:08:30+05:30 |
| **1** | Contract and UI skeleton (Checkpoint) | 3 h | **DONE** | 2026-10-04T11:43:00+05:30 |
| **2** | Infrastructure layer | 2 h | **DONE** | 2026-10-04T12:05:00+05:30 |
| **3** | Geocoding and locality discovery | 3 h | **DONE** | 2026-10-04T12:32:00+05:30 |
| **4** | Amenity profile | 2 h | **DONE** | 2026-10-04T12:46:00+05:30 |
| **5** | Commute engine | 3 h | Pending | — |
| **6** | Scoring engine and explanations | 2.5 h | Pending | — |
| **7** | Pipeline orchestration, live wiring, persistence | 3 h | Pending | — |
| **8** | Compare, saved, portal links | 1.5 h | Pending | — |
| **9** | Hardening, demo resilience, deploy, final docs | 3 h | Pending | — |

---

## Phase 2 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 32 unit tests passed).
2. **Acceptance Criteria Verification:**
   - Queue ordering: Verified FIFO in `tests/infra.test.ts`.
   - Queue spacing & concurrency: Verified spacing $\ge$ minSpacingMs and concurrent active tasks $\le$ concurrency.
   - Retries & Backoff: Verified exponential backoff with jitter on 429 and 503.
   - Mirror Failover: Verified automated rotation from primary to secondary mirror on 500 error.
   - Abort Propagation: Verified caller `AbortSignal` cancels waiting tasks and running requests.
   - Cache TTL: Verified `MemoryStorageAdapter` and `ResponseCache` expire stale entries after TTL.
   - Zero bare `fetch` in feature code: Verified.

---

## Phase 3 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 42 unit tests passed across 5 suites).
   - `npm run smoke` $\rightarrow$ Passed live smoke verification for Bengaluru (metro) and Pune (node city) with zero hardcoded data.
2. **Acceptance Criteria Verification:**
   - Parser tests: Tested against recorded fixtures `photon-koramangala.json`, `nominatim-bengaluru.json`, `nominatim-pune.json`, `overpass-locality-bengaluru.json` in `tests/parsers.test.ts`.
   - Centroids: Extracted across nodes, ways, and relations using `lat ?? center.lat`, `lon ?? center.lon`.
   - Stable IDs: Formatted consistently as `{type}/{id}` (e.g. `node/7301358178`, `way/257906450`).
   - Deduplication: Normalized names and 500m proximity threshold verified; prioritizes relation/way geometry over nodes.
   - Anchor distance ranking: Candidates ordered ascending by Haversine distance to primary workplace/anchor.
   - Bounding box fallback: Pune node fallback with exact bounding box and zero padding verified live.

---

## Phase 4 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 48 unit tests passed across 6 test suites).
   - `npm run smoke` $\rightarrow$ Verified real amenity profiling for Bengaluru (Fair Field Layout: 237 objects) and Pune (Shaniwar Peth: 279 objects).
2. **Acceptance Criteria Verification:**
   - Cross-check manual query: Verified against recorded probe fixture `overpass-amenity-counts.json` (healthcare: 79, education: 47, grocery: 23, food: 168, leisure: 58, busStops: 9, railStations: 0).
   - Real zero preservation: Preserved `value: 0`, `source: "osm"`, `confidence: "high"` for rail stations and Pune grocery.
   - Failure isolation: Query/network failure produces `value: null, source: "unavailable"` and descriptive note; zero fake defaults.
   - Radius invariant: Verified `buildAmenityProfileQuery` radii strictly equal `QUERY_RADII` and `MethodInfo.radii` (800m daily needs, 500m bus stops, 1500m institutions and safety).
   - Relative normalization: `log1p` + min-max normalization tested across candidates, with reference saturation ceiling fallback for $< 5$ candidates.


