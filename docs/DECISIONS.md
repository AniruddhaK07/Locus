# Locus — Architecture Decision Log

## Decision Index

| ID | Title | Date | Status |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Stack selection: Vite + React 19 + TypeScript + Vitest | 2026-10-04 | Accepted |
| **DEC-002** | ESLint boundary enforcement via `no-restricted-imports` | 2026-10-04 | Accepted |
| **DEC-003** | Environment variable management & safety policy handling | 2026-10-04 | Accepted |
| **DEC-004** | Direct-from-browser architecture (Zero server relay needed) | 2026-10-04 | Accepted |
| **DEC-005** | OSRM Table endpoint for N-candidate commute calculation | 2026-10-04 | Accepted |

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

### DEC-003: Environment Variable Management & Safety Policy
- **Context:** Sensitive file policies prevent direct write manipulation of files named `.env*` by automated tooling.
- **Decision:** Keep `env.example` in version control as the documentation and configuration template. Instruct the human user to populate `.env` with their specific `GEO_CONTACT` identifier (`locus.hackathon@gmail.com`).

---

### DEC-004: Direct-from-Browser Architecture (Zero Server Relay)
- **Context:** §3.2 and §3.6 require deciding between direct browser calls vs a serverless relay (`api/`). If external services block CORS or require secret keys, a relay is mandatory. If services allow CORS, direct browser calls spread load across each user's unique IP, preventing shared Overpass slot starvation.
- **Observed Evidence (from `scripts/probe/*`):**
  - Photon (`https://photon.komoot.io`): `CORS: *`
  - Nominatim (`https://nominatim.openstreetmap.org`): `CORS: *`
  - Overpass active mirrors (`overpass-api.de`, `z.overpass-api.de`, `lz4.overpass-api.de`): `CORS: *`
  - OSRM (`router.project-osrm.org`, `routing.openstreetmap.de`): `CORS: *`
- **Decision:** Adopt 100% direct-from-browser architecture. No server relay (`api/`) is required. Client-side HTTP infrastructure will handle rate-limiting queues, backoff with jitter, and mirror failover.

---

### DEC-005: OSRM Table Endpoint for Commute Batching
- **Context:** §4.3 suggests preferring a many-to-one `table` request over $N$ individual route calls.
- **Observed Evidence:** Live probe demonstrated `/table/v1/driving/{coords}?sources=0` computes driving times for 3 destinations in 150 ms with `CORS: *`.
- **Decision:** Use OSRM `/table/v1/` endpoint to batch compute commute times from workplace anchor to all $N=12$ candidate localities in a single request. Fall back to individual route requests only if table fails.
