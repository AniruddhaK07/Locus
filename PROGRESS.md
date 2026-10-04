# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 1 complete & Step B audit finished — starting Phase 2 (Infrastructure layer).
- **Done in Phase 1 & Step B:**
  - Defined full domain model in `src/engine/domain/types.ts`: `Measured<T>`, `Preferences`, `AreaSummary`, `AreaDetail`, `SearchState`, `ComparisonResult`, `MethodInfo`, `PortalLink`, `MockScenario`.
  - Implemented `MockEngine` in `src/engine/mock/mockEngine.ts` supporting all 6 scenarios.
  - Implemented progressive stage pipeline orchestration simulation.
  - Created lightweight wireframe stylesheet `src/ui/skeleton.css` (27 lines, strictly ≤ 80 lines).
  - Built all 8 screens and wireframe controls specified in §5.2 with `data-feature` and `data-state` attributes.
  - Added dev `ScenarioSwitcher.tsx` and dev catalog route `/_map` (`DevMapPage.tsx`).
  - Authored comprehensive UI contract manual `docs/UI_CONTRACT.md`.
  - Pushed initial milestone to `origin` (`main`, tags `phase-0`, `phase-1`).
  - **Contract Completeness Audit (Step B):**
    - `Measured<T>` on every displayed value confirmed.
    - Per-criterion breakdown (`points, maxPoints, effectiveWeight, raw`) confirmed.
    - `dataCompleteness` and `exceedsMax` flag confirmed.
    - Free-flow AND peak commute per destination and mode confirmed.
    - Added `localityErrors?: Record<AreaId, string>` to `SearchState` for explicit per-locality failure tracking.
    - Stable area IDs (`"{osmType}/{osmId}"`), load-more pagination, and cancel handle confirmed.
    - Added pure `selectAreas(areas, options)` function in engine API; refactored UI to be purely presentational.
    - Made `GEO_CONTACT` optional in `.env.example` and `README.md`.
  - `npm run check` passes 100% (20 unit tests).
- **In progress:** Phase 2 — Infrastructure layer (HTTP client, rate-limit queue, cache adapter, mirror failover).
- **Exact next step:** Create `src/engine/infra/` modules.
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
