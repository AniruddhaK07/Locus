# Locus — Development Progress & Log

## Resume here

- **Current Status:** **ALL PHASES COMPLETE (Phases 0–9)**. The entire Locus engine, UI, verification suites, and demo resilience snapshots are production-ready.
- **Done in Phase 9 (Hardening, Demo Resilience, Deploy, Final Docs):**
  - Error budget and request volume audit: established polite spacing and queue limits (Overpass 750ms, Nominatim 1000ms, OSRM 200ms) with per-locality failure isolation.
  - Demo-resilience snapshots: created authentic recorded snapshots in `fixtures/snapshots/` for Delhi (`delhi.json`), Bengaluru (`bengaluru.json`), and Pune (`pune.json`) with `fetchedAt` timestamps and zero fabricated data.
  - Implemented `SnapshotEngine` (`src/engine/snapshot/snapshotEngine.ts`) enabling 100% resilient offline demos via `VITE_ENGINE_MODE=snapshot`.
  - Added unit test suite `tests/snapshotEngine.test.ts` (5 tests) verifying snapshot search, area details, rescoring, comparison, and transparency.
  - Configured SPA deployment rewrites (`public/_redirects` and `vercel.json`).
  - Wrote `docs/DEMO_SCRIPT.md`: a comprehensive 3-minute honest walkthrough script for judges and users.
  - Audited and updated all documentation (`README.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `docs/DECISIONS.md`, `docs/VERIFIED_FACTS.md`, `docs/DATA_PROVENANCE.md`).
  - Verified production bundling: `npm run build` succeeds in 1.26s.
  - Verified comprehensive quality gate: `npm run check` passes 100% (112 tests across 11 test suites with 0 TypeScript and 0 ESLint errors).
- **How to verify:**
  ```bash
  npm run check
  npm run build
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
- **Phase 8 Completed:** `2026-10-04T13:40:00+05:30`
- **Phase 9 Completed:** `2026-10-04T13:50:00+05:30`
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
| **9** | Hardening, demo resilience, deploy, final docs | 3 h | **DONE** | 2026-10-04T13:50:00+05:30 |

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
   - Portal links: `buildPortalLinks` constructs site-scoped Google search queries for MagicBricks, Housing.com, 99acres, and universal Web Search fallback (`https://www.google.com/search?q=...`) with zero fragile direct slug guessing.

---

## Phase 9 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 112 unit tests passed across 11 test suites in 2.06s).
   - `npm run build` $\rightarrow$ Passed (Compiled in 1.26s producing clean static bundle: `dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`).
2. **Acceptance Criteria Verification:**
   - Clean clone runs per README: Zero external API keys needed, runs in mock, snapshot, or live mode seamlessly.
   - Demo-resilience snapshots: Created authentic pre-recorded fixtures for Delhi (`delhi.json`), Bengaluru (`bengaluru.json`), and Pune (`pune.json`) with verified `fetchedAt` timestamps and zero fabricated data.
   - Snapshot mode: `SnapshotEngine` serves offline requests with zero network calls and full functionality (search, detail, rescore, compare, saved, portal links).
   - Deployed build works: Added `public/_redirects` and `vercel.json` SPA routing rewrites.
   - Walkthrough script: Created `docs/DEMO_SCRIPT.md` detailing a 3-minute honest walkthrough stating what is directly measured vs estimated.
   - Zero drift in docs: Audited `README.md`, `ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/VERIFIED_FACTS.md`, `docs/DATA_PROVENANCE.md`, `docs/CALIBRATION.md`, `docs/UI_CONTRACT.md`. All claims match the codebase.

---

## Performance Optimization (perf/live-speed) Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 168 unit tests passed across 19 test suites in 3.1s).
   - `npm run smoke -- --city "Delhi"` $\rightarrow$ Passed live search pipeline benchmark in 111.9s with 100% data completeness for all 12 localities.
2. **Acceptance Criteria Verification:**
   - **Batched Amenity Queries:** Localities grouped into batches of 4 per Overpass request using named sets (`.health_0 out count; ...`). Zero-geometry payload (~1 KB), exact parity with single-locality radii, preserving null-vs-zero semantics.
   - **FOSSGIS Cluster Rate-Limit Protection:** `HttpClient` identifies cluster boundaries (`overpass-api.de`, `z.`, `lz4.`), prevents internal cluster failovers on HTTP 429, and respects `Retry-After`.
   - **Diagnostic Timing Attribution:** Detailed error cause attribution (`CONNECT_TIMEOUT`, `CONNECTION_RESET`, `HTTP_5XX`, `MIRROR_REJECTION`, `CLIENT_ABORT`, `OTHER`). Confirmed previous 25 "ERROR" requests were reverse-proxy TCP connection timeouts after 429 bursts.
   - **Stop-Loss Protection (Circuit Breaker & 90s Budget):** Tripped after 3 consecutive failures. Configurable stage time budget (`maxAmenityStageMs`, default 90s). Timed-out or paused candidates receive explicit `null` amenities with honest explanatory notes. Unit-tested in `tests/pipeline.test.ts` and `tests/circuitBreaker.test.ts`.
   - **Progressive / Incremental Results:** Ranked result cards are scored and emitted after each batch of 4 localities. First cards appear in ~18s from cold start.
   - **Test Engine Isolation:** Engine mode pinned to `"mock"` during Vitest execution via `vite.config.ts` and `src/engine/index.ts` guard, guaranteeing tests pass cleanly regardless of `.env.local`.
   - **Live Benchmark (Delhi):**
     - Baseline (Step 1): ~370s total runtime, 37 requests, 25 connect timeouts / firewall resets.
     - Optimized (Step 2): 111.9s total runtime, 12 requests (6x 200, 4x 504 handled via mirror failover, 2 client timeouts), 12/12 localities profiled with 100% completeness (#1 Malka Ganj 83%, #2 Nehru Kutia 79%, #3 Kabir Basti 75%).

---

## Resume Here
- **Current Branch:** `perf/live-speed` (clean working tree, pushed to origin).
- **Status:** Step 2 live performance optimizations completed and verified against live Delhi run. All 168 tests green.
- **Next Action:** Await user review/approval of the performance benchmark report before merging `perf/live-speed` into `main`.
