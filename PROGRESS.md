# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 6 complete — starting Phase 7 (Pipeline orchestration, live wiring, persistence).
- **Done in Phase 6:**
  - Implemented continuous, monotone budget utility function `computeBudgetUtility` with strict property tests (continuity at $R_{\min}, R_t, R_{\max}$, monotonicity for $R > R_t$, and $U \in [0, 1]$).
  - Implemented `RentProvider` with `CityTierBand` heuristic estimate scaled by candidate centrality rank + `UserOverride` precedence.
  - Implemented `computeSafetyIndicator` evaluating physical OSM infrastructure tags (police, lit ways, surveillance) with thin coverage check and mandatory caveat `"infrastructure indicator, not crime data"`.
  - Implemented `computeHouseholdFit` evaluating deterministic persona blends (family, couple, student, balanced) without hardcoded ratings.
  - Implemented `scoreArea` multi-criteria scoring combining 6 criteria, confidence factoring ($W_{eff} = W_{base} \times C$), renormalization over non-null inputs ($S_{eff} > 0$), and `dataCompleteness` calculation.
  - Implemented `generateExplanations` producing template-based plain English summaries and exactly 3 `keyFacts` without LLM calls.
  - Added unit test suite `tests/scoring.test.ts` (27 tests) verifying budget properties, sparse data renormalization, zero vs null distinction, and a static AST/regex guard prohibiting `||` default substitutions on measured values.
  - Verified `npm run check` passes 100% (90 unit tests across 8 test suites).
- **In progress:** Phase 7 — Pipeline orchestration, live wiring, persistence.
- **Phase 7 Plan (5–10 lines):**
  1. Implement `SearchPipeline` orchestrating progressive stages (`resolving-city` $\rightarrow$ `discovering-localities` $\rightarrow$ `routing` $\rightarrow$ `profiling-amenities` $\rightarrow$ `scoring` $\rightarrow$ `done`).
  2. Implement progressive state emissions via `SearchHandle` emitting updates after each locality batch so UI displays cards immediately.
  3. Wire cancellation mechanics with `AbortController` and infra queue task purging on abort.
  4. Implement `LiveEngine` implementing the public `Engine` interface using real providers, caching in IndexedDB.
  5. Implement `prefsToQuery` and `queryToPrefs` for shareable URL query serialization and deep-linking.
  6. Support direct locality detail retrieval by stable id `"{type}/{id}"` from cache or on-demand fetch.
  7. Toggle engine mode via `VITE_ENGINE_MODE=live` without modifying UI presentation code.
  8. Write pipeline unit tests in `tests/pipeline.test.ts` asserting progressive states, failure isolation, and abort handling; verify with `npm run smoke`.
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
- **Phase 5 Completed:** `2026-10-04T12:55:00+05:30`
- **Phase 6 Completed:** `2026-10-04T13:10:00+05:30`
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
