# Locus — Development Progress & Log

## Resume here

- **Current Phase:** Phase 0 complete — awaiting human checkpoint confirmation to start Phase 1.
- **Done in Phase 0:**
  - Git repository initialized fresh (`2026-10-04T10:41:19+05:30`).
  - Master build prompt copied to `docs/MASTER_PROMPT.md`.
  - Full Vite + React 19 + TypeScript (`strict: true`) + Vitest + ESLint environment configured.
  - Architectural boundaries strictly enforced via ESLint `no-restricted-imports` and demonstrably verified with intentional failing imports in both directions.
  - All living docs created with real verified content (`README.md`, `ARCHITECTURE.md`, `PROGRESS.md`, `docs/DECISIONS.md`, `docs/VERIFIED_FACTS.md`, `docs/DATA_PROVENANCE.md`, `docs/UI_CONTRACT.md`).
  - Live probe scripts written and executed for Photon, Nominatim, Overpass mirrors, and OSRM hosts/profiles. Real payloads captured and saved in `fixtures/recorded/`.
  - Verified 100% CORS support (`access-control-allow-origin: *`) across Photon, Nominatim, Overpass mirrors (`overpass-api.de`, `z.overpass-api.de`, `lz4.overpass-api.de`), and OSRM (`router.project-osrm.org`, `routing.openstreetmap.de`).
  - Verified OSRM `/table/v1/` endpoint (150 ms latency for batch durations).
  - Adopted direct-from-browser architecture (`DEC-004`), eliminating shared server IP starvation and rendering serverless relays (`api/`) unnecessary.
  - `npm run check` passes cleanly (TSC + ESLint + Vitest).
- **In progress:** Phase 0 Checkpoint & awaiting user confirmation of batched questions.
- **Exact next step:** Begin Phase 1 (define public engine domain types, implement mock engine with scenarios, build wireframe skeleton UI, draft comprehensive `docs/UI_CONTRACT.md`).
- **How to check:**
  ```bash
  npm run check
  ```
- **Known gaps / Blockers:**
  - Automated writes to `.env*` are blocked by tool security hooks. `env.example` is committed as template; user should confirm `.env` with `GEO_CONTACT=locus.hackathon@gmail.com`.
  - Overpass mirrors `kumi.systems` and `maps.mail.ru` are currently unreachable and dropped from mirror rotation.

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
| **1** | Contract and UI skeleton (Checkpoint) | 3 h | Pending | — |
| **2** | Infrastructure layer | 2 h | Pending | — |
| **3** | Geocoding and locality discovery | 3 h | Pending | — |
| **4** | Amenity profile | 2 h | Pending | — |
| **5** | Commute engine | 3 h | Pending | — |
| **6** | Scoring engine and explanations | 2.5 h | Pending | — |
| **7** | Pipeline orchestration, live wiring, persistence | 3 h | Pending | — |
| **8** | Compare, saved, portal links | 1.5 h | Pending | — |
| **9** | Hardening, demo resilience, deploy, final docs | 3 h | Pending | — |

---

## Phase 0 Log & Verified Results

1. **Boundary Rule Verification:**
   - Introduced `import React from "react"` and `import { App } from "../ui/App"` inside `src/engine/bad_import_test.ts` $\rightarrow$ ESLint rejected with 2 errors.
   - Introduced `import { something } from "../engine/config/weights"` inside `src/ui/bad_ui_import_test.ts` $\rightarrow$ ESLint rejected with 1 error.
   - Test files deleted; lint clean.
2. **External Probes:**
   - `scripts/probe/probe-photon.ts`: Verified 200 OK, `CORS: *`, typeahead-ready GeoJSON.
   - `scripts/probe/probe-nominatim.ts`: Verified 200 OK, `CORS: *`, relation for Bengaluru/Delhi, node for Pune.
   - `scripts/probe/probe-overpass.ts`: Verified 200 OK, `CORS: *`, 1155 localities in Bengaluru (including 95 polygons), single-request 7-category amenity counts (`out count;`).
   - `scripts/probe/probe-osrm.ts`: Verified 200 OK, `CORS: *`, car/bike/foot profiles active, `/table/v1/` many-to-one batching in 150 ms.
3. **Pipeline Verification:**
   - Ran `npm run check` $\rightarrow$ 0 errors, 1 test passed.
