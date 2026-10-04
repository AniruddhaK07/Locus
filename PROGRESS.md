# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 5 complete — starting Phase 6 (Scoring engine and explanations).
- **Done in Phase 5:**
  - Implemented `OsrmRoutingProvider` (`src/engine/providers/routing/osrm.ts`) querying multi-modal endpoints on `routing.openstreetmap.de` (`routed-car`, `routed-bike`, `routed-foot`) with `/table` matrix batching and fallback to demo host.
  - Implemented honest peak congestion heuristic: $T_{peak} = T_{freeflow} \times (1 + \alpha_{city} \times (1 - \exp(-d / 8)))$ reporting calculated peak minutes and lower/upper ranges.
  - Implemented city tier lookup (`resolveCityAlpha`) resolving $\alpha_{city}$ strictly from geocoder administrative tags (Mega-Metro 2.3, Dense Metro 1.9, Large Metro 1.6, Standard 1.2).
  - Implemented multi-destination blending (70% primary destination + 30% extras average) and commute exponential decay utility.
  - Created `docs/CALIBRATION.md` detailing the congestion heuristic and empirical calibration table.
  - Created unit test suite `tests/commute.test.ts` (15 tests) verifying tier resolution, corridor calibration, 70/30 weighting, failure isolation, and OSRM table URL building & parsing.
  - Extended live smoke script `scripts/smoke.ts` to execute live multi-modal routing for Bengaluru (5m free-flow $\rightarrow$ 8m peak) and Pune (1m free-flow $\rightarrow$ 1m peak) and verified unverified transit mode produces explicit `null`.
  - Verified `npm run check` passes 100% (63 unit tests across 7 test suites).
- **In progress:** Phase 6 — Scoring engine and explanations.
- **Phase 6 Plan (5–10 lines):**
  1. Implement budget utility function with strict property tests (continuity at $R_{\min}, R_t, R_{\max}$, monotonicity, $U \in [0, 1]$).
  2. Implement `RentProvider` with `CityTierBand` heuristic estimate scaled by locality rank + `UserOverride` support.
  3. Implement `SafetyProvider` computing infrastructure indicators (police, lit ways, surveillance) with coverage check and explicit disclaimers.
  4. Implement household fit scoring (family, couple, student, balanced) derived deterministically from category counts.
  5. Implement multi-criteria weighting, confidence factoring, renormalization over non-null criteria, and `dataCompleteness` calculation.
  6. Implement template-based plain English explanations highlighting strengths, caveats, and low-confidence inputs without LLM calls.
  7. Write unit tests in `tests/scoring.test.ts` asserting all budget property tests, sparse data handling, and absence of `||` defaults.
  8. Run `npm run check`, commit `phase(5): Commute engine`, tag `phase-5`, and push.
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



