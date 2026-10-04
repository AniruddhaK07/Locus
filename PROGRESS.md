# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 0 complete + clarifications logged; starting Phase 1 (Contract and UI skeleton).
- **Done in Phase 0:**
  - Git repository initialized fresh (`2026-10-04T10:41:19+05:30`).
  - Master build prompt copied to `docs/MASTER_PROMPT.md`.
  - Full Vite + React 19 + TypeScript (`strict: true`) + Vitest + ESLint environment configured.
  - Architectural boundaries strictly enforced via ESLint `no-restricted-imports` and demonstrably verified with intentional failing imports in both directions.
  - All living docs created with real verified content (`README.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `docs/DECISIONS.md`, `docs/VERIFIED_FACTS.md`, `docs/DATA_PROVENANCE.md`, `docs/UI_CONTRACT.md`).
  - Live probe scripts written and executed for Photon, Nominatim, Overpass mirrors, and OSRM hosts/profiles. Real payloads captured and saved in `fixtures/recorded/`.
  - Verified 100% CORS support (`access-control-allow-origin: *`) across Photon, Nominatim, Overpass mirrors (`overpass-api.de`, `z.overpass-api.de`, `lz4.overpass-api.de`), and OSRM (`routing.openstreetmap.de`).
  - Probed OSRM profiles: Demo host `router.project-osrm.org` ignores profile and returns identical driving times for bike/walk; `routing.openstreetmap.de` verified with distinct car, bike, and foot durations and `/table` support.
  - Probed Overpass mirrors: `overpass-api.de`, `z.overpass-api.de`, and `lz4.overpass-api.de` belong to the same backend pool and are not independent in practice. External mirrors (`kumi.systems`, `mail.ru`, `openstreetmap.fr`) were dead, 504, or 403.
  - Probed Pune node resolution: Overpass `is_in` enclosing admin area lookup found `Pune City Subdistrict` (admin_level 6), returning 82 localities.
  - Corrected polygon perspective: 95 of 1,155 elements (~8.2%) in Bengaluru are polygons; ranking and selecting top $N=12$ is the core challenge.
  - Adopted direct-from-browser architecture (`DEC-004`). `GEO_CONTACT` made optional.
  - `npm run check` passes cleanly (TSC + ESLint + Vitest).
- **In progress:** Phase 1 — Defining public engine domain types, implementing mock engine with scenarios, and building wireframe skeleton UI.
- **Exact next step:** Create `src/engine/domain/` types and mock engine.
- **How to check:**
  ```bash
  npm run check
  ```
- **Known gaps:**
  - `router.project-osrm.org` cannot be used for bike/walk (driving only). Multi-modal routing uses `routing.openstreetmap.de`.
  - Overpass mirrors from the Roland Olbricht cluster share the same IP slot pool; request rate must be carefully queued with ≥ 700 ms spacing and concurrency 1.
  - When city resolves to a node (like Pune), either `is_in` enclosing boundary or exact geocoder bounding box fallback must be used.
  - Transit mode (metro/bus schedule routing) is unverified and disabled in v1.
  - Rent data from listing portals is unavailable via unauthenticated API; starter tier-band heuristic + user override is used.

---

## Project Metadata

- **Start Timestamp:** `2026-10-04T10:41:19+05:30`
- **Phase 0 Completed:** `2026-10-04T11:08:30+05:30`
- **Repository:** `locus`

---

## Phase Overview

| Phase | Title | Budget | Status | Completed At |
| :--- | :--- | :--- | :--- | :--- |
| **0** | Bootstrap and verification | 1.5 h | **DONE** | 2026-10-04T11:08:30+05:30 |
| **1** | Contract and UI skeleton (Checkpoint) | 3 h | **IN PROGRESS** | — |
| **2** | Infrastructure layer | 2 h | Pending | — |
| **3** | Geocoding and locality discovery | 3 h | Pending | — |
| **4** | Amenity profile | 2 h | Pending | — |
| **5** | Commute engine | 3 h | Pending | — |
| **6** | Scoring engine and explanations | 2.5 h | Pending | — |
| **7** | Pipeline orchestration, live wiring, persistence | 3 h | Pending | — |
| **8** | Compare, saved, portal links | 1.5 h | Pending | — |
| **9** | Hardening, demo resilience, deploy, final docs | 3 h | Pending | — |
