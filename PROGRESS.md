# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 1 complete — standing by at Phase 1 Checkpoint for human UI wireframe review before starting Phase 2.
- **Done in Phase 1:**
  - Defined full domain model in `src/engine/domain/types.ts`: `Measured<T>`, `Preferences`, `AreaSummary`, `AreaDetail`, `SearchState`, `ComparisonResult`, `MethodInfo`, `PortalLink`, `MockScenario`.
  - Implemented `MockEngine` in `src/engine/mock/mockEngine.ts` supporting all 6 scenarios: `normal`, `slow`, `partial`, `empty`, `error`, `sparse-data`.
  - Implemented progressive stage pipeline orchestration simulation (`resolving-city` -> `discovering-localities` -> `routing` -> `profiling-amenities` -> `scoring` -> `done`).
  - Created lightweight wireframe stylesheet `src/ui/skeleton.css` (27 lines, strictly ≤ 80 lines).
  - Built all 8 screens and wireframe controls specified in §5.2:
    - `/` Home (`HomePage.tsx`)
    - `/plan` 3-step preference stepper (`PlanPage.tsx`)
    - `/results` Search results with progress panel, sort/filter, map placeholder, cards, sticky compare bar (`ResultsPage.tsx`)
    - `/area/:id` Area detail with score breakdown table, commute breakdown, amenity grid with exact radii, rent override input, safety panel, and portal links (`AreaDetailPage.tsx`)
    - `/compare` Side-by-side comparison with per-row winner marker (`ComparePage.tsx`)
    - `/saved` Reactive shortlist with persistence across reloads (`SavedPage.tsx`)
    - `/method` Methodology, weights, radii, routing availability, confidence legend, limitations from `engine.method()` (`MethodPage.tsx`)
    - `/_map` Dev catalog of all routes, 65+ `data-feature` IDs, and scenario switchers (`DevMapPage.tsx`)
  - Implemented always-available top dev banner (`ScenarioSwitcher.tsx`).
  - Added unit test suite `tests/mockEngine.test.ts` (11 tests covering all scenarios, rent overrides, compare, saved store, URL serialization).
  - Produced comprehensive contract manual `docs/UI_CONTRACT.md`.
  - Verified architectural boundary: `src/ui/**` imports only from `@engine` (`src/engine/index.ts`); `src/engine/**` has zero UI/React imports.
  - Verified `npm run check` passes 100% (TSC + ESLint + Vitest) and production build `npm run build` succeeds.
- **In progress:** Phase 1 Checkpoint review.
- **Exact next step:** Await human review of the UI skeleton contract, then proceed to Phase 2 (Infrastructure layer: HTTP client, rate-limit queue, cache adapter, mirror failover).
- **How to check:**
  ```bash
  npm run check
  npm run build
  npm run dev
  ```
- **Known gaps:**
  - Multi-modal routing uses `routing.openstreetmap.de` (car, bike, foot verified; demo host `router.project-osrm.org` only supports driving).
  - Overpass mirrors belong to a single Roland Olbricht backend cluster; IP rate limits are shared.
  - Transit mode (metro/bus schedule routing) is unverified and disabled in v1.
  - Rent data from listing portals is unavailable via unauthenticated API; starter tier-band heuristic + user override is used.

---

## Project Metadata

- **Start Timestamp:** `2026-10-04T10:41:19+05:30`
- **Phase 0 Completed:** `2026-10-04T11:08:30+05:30`
- **Phase 1 Completed:** `2026-10-04T11:43:00+05:30`
- **Repository:** `locus`

---

## Phase Overview

| Phase | Title | Budget | Status | Completed At |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Bootstrap and verification | 1.5 h | **DONE** | 2026-10-04T11:08:30+05:30 |
| **1** | Contract and UI skeleton (Checkpoint) | 3 h | **DONE** | 2026-10-04T11:43:00+05:30 |
| **2** | Infrastructure layer | 2 h | Pending | — |
| **3** | Geocoding and locality discovery | 3 h | Pending | — |
| **4** | Amenity profile | 2 h | Pending | — |
| **5** | Commute engine | 3 h | Pending | — |
| **6** | Scoring engine and explanations | 2.5 h | Pending | — |
| **7** | Pipeline orchestration, live wiring, persistence | 3 h | Pending | — |
| **8** | Compare, saved, portal links | 1.5 h | Pending | — |
| **9** | Hardening, demo resilience, deploy, final docs | 3 h | Pending | — |

---

## Phase 1 Verification & Acceptance Results

1. **Commands Executed:**
   - `npm run check` $\rightarrow$ Passed (0 TS errors, 0 ESLint errors/warnings, 12 unit tests passed).
   - `npm run build` $\rightarrow$ Passed in 1.26s (`dist/index.html` 0.39 kB, `dist/assets/index.js` 333 kB).
2. **Acceptance Criteria Verification:**
   - Every screen and control in §5.2 exists, tagged with `data-feature` and `data-state`.
   - Every scenario (`normal`, `slow`, `partial`, `empty`, `error`, `sparse-data`) renders distinct states in mock mode.
   - `/_map` lists every route, feature ID, and provides direct triggers for every scenario.
   - ESLint proves the UI layer imports solely from `@engine` (`src/engine/index.ts`).
   - `docs/UI_CONTRACT.md` delivers complete documentation and types for human UI designers.
