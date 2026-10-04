# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 2 complete — starting Phase 3 (Geocoding and locality discovery).
- **Done in Phase 2:**
  - Implemented `StorageAdapter` with `MemoryStorageAdapter` and `IndexedDBStorageAdapter` (`src/engine/infra/storage.ts`).
  - Implemented `ResponseCache` with configurable TTL (`src/engine/infra/cache.ts`).
  - Implemented `RateLimitQueue` with strict FIFO ordering, configurable concurrency, minimum request spacing, and `AbortSignal` cancellation (`src/engine/infra/queue.ts`).
  - Implemented `HttpClient` with timeout, retries with exponential backoff & jitter (0.8–1.2x) on 429/5xx, automated mirror failover, response cache integration, and queueing (`src/engine/infra/httpClient.ts`).
  - Created unit test suite `tests/infra.test.ts` (12 tests) verifying queue ordering, concurrency, spacing, abort propagation, cache TTL expiration, 429 backoff retries, and mirror failover.
  - Verified no feature code uses bare `fetch`.
  - `npm run check` passes 100% (32 unit tests across 4 test suites).
  - Pushed commits up to Step B to `origin/main`.
- **In progress:** Phase 3 — Geocoding and locality discovery.
- **Exact next step:** Implement typeahead geocoding provider (Photon), city resolution (Nominatim with relation and enclosing area fallback), and locality discovery provider (Overpass node/way/relation).
- **How to check:**
  ```bash
  npm run check
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
- **Repository:** `https://github.com/AniruddhaK07/Locus.git`

---

## Phase Overview

| Phase | Title | Budget | Status | Completed At |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Bootstrap and verification | 1.5 h | **DONE** | 2026-10-04T11:08:30+05:30 |
| **1** | Contract and UI skeleton (Checkpoint) | 3 h | **DONE** | 2026-10-04T11:43:00+05:30 |
| **2** | Infrastructure layer | 2 h | **DONE** | 2026-10-04T12:05:00+05:30 |
| **3** | Geocoding and locality discovery | 3 h | Pending | — |
| **4** | Amenity profile | 2 h | Pending | — |
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
