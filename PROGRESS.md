# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 8 complete — starting Phase 9 (Hardening, demo resilience, deploy, final docs).
- **Done in Phase 8:**
  - Implemented `compareAreas` (`src/engine/features/compare.ts`) formatting side-by-side metric comparisons with per-row winner detection (`higherIsBetter` vs `lowerIsBetter`), tie handling, and missing-value preference.
  - Implemented `SavedStore` (`src/engine/features/saved.ts`) with persistent storage fallback, reactive subscriptions, deduplication, and cross-tab `StorageEvent` synchronization.
  - Implemented `buildPortalLinks` (`src/engine/features/portals.ts`) generating search queries for MagicBricks, Housing.com, 99acres, plus guaranteed universal Google Search fallback link (zero brittle slug guessing).
  - Wired into `LiveEngine`, `MockEngine`, and exported cleanly via `@engine`.
  - Added unit test suite `tests/features.test.ts` (6 tests) verifying compare winners, ties, null metrics, saved subscriptions, and portal link construction.
  - All 107 tests across 10 test suites pass cleanly.
- **In progress:** Phase 9 — Hardening, demo resilience, deploy, final docs.
- **Phase 9 Plan (5–10 lines):**
  1. Conduct request volume and error budget review across external services.
  2. Create demo-resilience snapshots for 3 demo cities (Delhi, Bengaluru, Pune) in `fixtures/snapshots/` with recorded data and `fetchedAt`.
  3. Implement snapshot provider / mode switch (`VITE_ENGINE_MODE=snapshot`) so offline/stage presentations run with zero external network failure risk.
  4. Write `docs/DEMO_SCRIPT.md`: a 3-minute honest walkthrough stating what is directly measured vs estimated.
  5. Audit README and all docs against final code for zero drift or stale claims.
  6. Verify full production build (`npm run build`) and final check (`npm run check`).
  7. Commit `phase(9): Hardening, demo resilience, deploy, final docs`, tag `phase-9`, and push.
- **How to check:**
  ```bash
  npm run check
  npm run smoke -- --city "Pune"
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
- **Phase 5 Completed:** `2026-10-04T12:55:00+05:30`
- **Phase 6 Completed:** `2026-10-04T13:10:00+05:30`
- **Phase 7 Completed:** `2026-10-04T13:28:00+05:30`
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
| **5** | Commute engine | 3 h | **DONE** | 2026-10-04T12:55:00+05:30 |
| **6** | Scoring engine and explanations | 2.5 h | **DONE** | 2026-10-04T13:10:00+05:30 |
| **7** | Pipeline orchestration, live wiring, persistence | 3 h | **DONE** | 2026-10-04T13:28:00+05:30 |
| **8** | Compare, saved, portal links | 1.5 h | **DONE** | 2026-10-04T13:40:00+05:30 |
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

---

## Phase 5 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 63 unit tests passed across 7 test suites).
   - `npm run smoke` $\rightarrow$ Verified multi-modal OSRM routing and peak ranges for top 5 localities in Bengaluru and Pune.
2. **Acceptance Criteria Verification:**
   - Unit tests for heuristic: Verified $T_{peak} = T_{freeflow} \times (1 + \alpha \times (1 - \exp(-d/8)))$ in `tests/commute.test.ts`.
   - Tier lookup: Verified `resolveCityAlpha` correctly derives $\alpha$ strictly from administrative tags (Mega-Metro 2.3, Dense Metro 1.9, Large Metro 1.6, Standard 1.2).
   - Live smoke: Printed free-flow and peak ranges for top 5 localities in Bengaluru and Pune.
   - Disabled/unverified modes: Confirmed `transit` mode is visibly reported as `DISABLED/UNVERIFIED (null)` with transparent explanation.
   - Documentation: Provided `docs/CALIBRATION.md` with empirical observation calibration table.




---

## Phase 6 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 90 unit tests passed across 8 test suites in 1.95s).
2. **Acceptance Criteria Verification:**
   - Budget property tests: Continuity at $R_{\min}, R_t, R_{\max}$; monotonicity for $R > R_t$; $U \in [0, 1]$; $U(R_{\max} - \epsilon) > U(R_{\max} + \epsilon)$ verified in `tests/scoring.test.ts`.
   - Sparse data cases: When safety and transit data are null, weights renormalize to 100, `dataCompleteness` drops proportionally (e.g. to 0.74), and points are computed without distortion.
   - Strict zero vs null: Verified that real 0 count retains `maxPoints` and contributes to `dataCompleteness`, while missing `null` has `maxPoints = 0` and is excluded from completeness.
   - Rent provider: Starter tier bands scaled by candidate rank (central vs peripheral) verified; user rent override takes immediate precedence (`source: "user"`, `confidence: "high"`).
   - Safety indicator: Derived purely from physical OSM tags (police, lit ways, surveillance); labels `"infrastructure indicator, not crime data"`; yields `null` when zero tags are mapped.
   - Zero-fabrication AST/regex guard: Static code test scans all scoring files to ensure no `.value || <default>` pattern exists.
   - Template explanations: Generates honest summary statements and exactly 3 `keyFacts` covering commute, lifestyle/fit, and rent/caveats with zero LLM calls.

---

## Phase 7 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 101 unit tests passed across 9 test suites in 2.0s).
   - `npm run smoke -- --city "Pune"` $\rightarrow$ Passed end-to-end live pipeline verification across all 6 stages.
2. **Acceptance Criteria Verification:**
   - Unchanged skeleton UI works end-to-end in live mode: Switched seamlessly via `VITE_ENGINE_MODE=live` without changing any UI presentation code.
   - Reload on `/results` and `/area/:id` re-hydrates: `LiveEngine.getArea(id)` re-hydrates cached `AreaDetail` from `StorageAdapter` / IndexedDB.
   - Cancellation and restarts: Verified `searchHandle.cancel()` and starting a new search cleanly aborts previous in-flight requests and leaves no stale updates.
   - Per-locality failure isolation: Simulated locality timeout in `tests/pipeline.test.ts` verified that failed localities receive `null` metrics with lowered completeness while the other localities complete normally.
   - Live smoke test on Pune: Overpass discovered 138 candidates, OSRM routed matrix in 1.7s, Overpass profiled 12 candidates through 750ms rate limiter in 131s, scoring and ranking top 3 (#1 Narayan Peth 91%, #2 Sadashiv Peth 89%, #3 Deccan Gymkhana 89%) with 100% completeness.

---

## Phase 8 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 107 unit tests passed across 10 test suites in 2.05s).
2. **Acceptance Criteria Verification:**
   - Multi-area side-by-side comparison: `compareAreas` formats comparative metrics for up to 3 candidate areas across match score, commute, rent, amenities, safety, and completeness.
   - Winner logic: Evaluates `higherIsBetter` vs `lowerIsBetter`; tie conditions produce `winnerId = undefined` (no arbitrary winner chosen); real measured values always win against missing `null` values.
   - Saved shortlist store: `SavedStore` manages IDs with persistent storage, listeners, and cross-tab `StorageEvent` synchronization.
   - Portal links: `buildPortalLinks` constructs queries for MagicBricks, Housing.com, 99acres, and always appends a resilient Google search query fallback (`https://www.google.com/search?q=rent+flats+in+{area}+{city}`) with zero fragile slug guessing.
