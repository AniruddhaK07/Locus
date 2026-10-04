# Locus — Architecture Decision Log

## Decision Index

| ID | Title | Date | Status |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Stack selection: Vite + React 19 + TypeScript + Vitest | 2026-10-04 | Accepted |
| **DEC-002** | ESLint boundary enforcement via `no-restricted-imports` | 2026-10-04 | Accepted |
| **DEC-003** | Environment variable management & safety policy handling | 2026-10-04 | Accepted |
| **DEC-004** | Direct-from-browser architecture (Zero server relay needed) | 2026-10-04 | Accepted |
| **DEC-005** | Multi-modal routing via `routing.openstreetmap.de` (car, bike, foot) | 2026-10-04 | Accepted |

---

### DEC-001: Stack Selection
- **Context:** Need minimal, ultra-fast modern web stack supporting strict TypeScript, unit testing, and lightweight decoupled UI.
- **Decision:** Use Vite 6, React 19, React Router 7, TypeScript 5, Vitest 3, ESLint 9, `tsx` for probe/utility execution.
- **Dependency Rationale:**
  - `react`, `react-dom`: Standard modern declarative UI library for wireframe skeleton and human styling.
  - `react-router-dom`: Client-side routing for `/`, `/plan`, `/results`, `/area/:id`, `/compare`, `/saved`, `/method`, `/_map`.
  - `vite`: Minimalist ESM bundler with near-instant hot module replacement.
  - `typescript`: Static typing with `strict: true` to prevent undefined/null runtime bugs.
  - `vitest`: In-process test runner sharing Vite module resolution.
  - `eslint`, `typescript-eslint`: Linting and architectural constraint enforcement.
  - `tsx`: Fast TypeScript execution for probes and scripts without compilation step.

---

### DEC-002: Architectural Boundary Enforcement
- **Context:** §3.1 requires strict decoupling between `src/engine/` and `src/ui/`. The UI builder must never alter engine logic, and the engine must remain 100% framework-agnostic.
- **Decision:** Configure ESLint with `no-restricted-imports`.
  - Rules for `src/engine/**`: Forbid imports from `react`, `react-dom`, `react-router-dom`, and `src/ui/**`.
  - Rules for `src/ui/**`: Forbid deep imports from `src/engine/!(index)`. UI may only import from `src/engine/index.ts` (or `@engine`).
- **Verification:** Deliberate bad imports created in both directions in Phase 0 were verified to fail ESLint immediately.

---

### DEC-003: Environment Variable Management & Public Client Identity
- **Context:** Direct browser architecture means all outbound requests are visible to client networks. Sensitive files (`.env*`) cannot be committed or modified by automated tools.
- **Decision:** Keep `env.example` as tracked template. In direct browser mode, `GEO_CONTACT` is purely optional (passed as `&email=` parameter to Nominatim on-submit if configured in local `.env`, or omitted so Nominatim identifies the application via the browser's `Referer` origin). No real user email is embedded in tracked source files.

---

### DEC-004: Direct-from-Browser Architecture (Zero Server Relay)
- **Context:** §3.2 and §3.6 require deciding between direct browser calls vs a serverless relay (`api/`).
- **Observed Evidence (from `scripts/probe/*`):**
  - Photon (`https://photon.komoot.io`): `CORS: *`
  - Nominatim (`https://nominatim.openstreetmap.org`): `CORS: *`
  - Overpass active mirrors (`overpass-api.de`, `z.overpass-api.de`, `lz4.overpass-api.de`): `CORS: *`
  - OSRM multi-modal (`routing.openstreetmap.de`): `CORS: *`
- **Decision:** Adopt 100% direct-from-browser architecture. No server relay (`api/`) is required. Client-side HTTP infrastructure will handle rate-limiting queues, backoff with jitter, and mirror failover.

---

### DEC-005: Multi-Modal Routing via `routing.openstreetmap.de`
- **Context:** Live probes demonstrated that `router.project-osrm.org` ignores `bike` and `foot` profiles (returning identical car durations).
- **Decision:** Use `routing.openstreetmap.de` which provides dedicated `routed-car`, `routed-bike`, and `routed-foot` endpoints with `/table` and `/route` support and verified distinct timings.
