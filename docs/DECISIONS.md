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

---

### DEC-006: Node-Resolved City Discovery Fallback
- **Context:** Certain cities in India (such as Pune, node/1218520286) resolve in Nominatim to an OSM node rather than an administrative relation boundary.
- **Decision:** When relation ID is absent, use Overpass `is_in` query filtered by `admin_level="8"` or fallback to the exact geocoder bounding box `[south, north, west, east]` with zero padding. This guarantees robust locality discovery for both metro relations and node cities.

---

### DEC-007: Continuous Monotone Budget Utility & Starter Tier Bands
- **Context:** Commercial listing APIs in India are authenticated and paid, while user budget satisfaction follows non-linear diminishing returns above target.
- **Decision:** Implement a piecewise continuous monotone utility function $U(R)$ with exponential penalty for $R > R_{\max}$ and linear decay between $R_t$ and $R_{\max}$. Use starter municipal tier bands (Prime, Standard, Tier 2, Tier 3) scaled by candidate centrality rank, and allow immediate user rent overrides which promote confidence to high (`source: "user"`).

---

### DEC-008: Physical OSM Infrastructure Tags for Safety Indicators
- **Context:** Police crime records are not accessible via open APIs in India, and commercial amenity density is not an indicator of personal safety.
- **Decision:** Derive safety indicator exclusively from physical OpenStreetMap infrastructure tags: `amenity=police`, `way[lit=yes]`, `node[man_made=surveillance]`. Require the explicit disclaimer: *"Infrastructure indicator based on physical features, not police crime data."* Exclude or set to `null` when tag coverage is too thin.

---

### DEC-009: Resilient Rental Portal Links via Search Queries & Universal Fallback
- **Context:** Listing portals frequently change internal locality slug hierarchies (e.g. `-bangalore-ffid`), causing hardcoded URL patterns to 404.
- **Decision:** Use official portal search query parameters (`?keyword=...` or `?q=...`) for MagicBricks, Housing.com, and 99acres. Always append a universal search engine fallback link (`https://www.google.com/search?q=rent+flats+in+{area}+{city}`) ensuring the user always has a guaranteed working search path.

---

### DEC-010: Triple-Mode Engine Architecture (Mock, Snapshot, Live)
- **Context:** Hackathon presentations and live demos are prone to unreliable public Wi-Fi or transient rate-limiting from public OSM servers.
- **Decision:** Support 3 first-class engine modes selectable via `VITE_ENGINE_MODE`:
  1. `mock`: Deterministic scenario fixtures for instant UI integration.
  2. `snapshot`: Authentic recorded responses captured from live runs with verified `fetchedAt` timestamps for Delhi, Bengaluru, and Pune.
  3. `live`: Real-time querying of Nominatim, Overpass API, and OSRM with queue management and error isolation.
  Mode switching requires zero changes to UI components.

---

### DEC-011: Self-Hosted Font Delivery via `@fontsource`
- **Context:** §2.4 forbids external CDN font or script requests at runtime. The design system requires refined serif display typography and clean neutral sans body typography.
- **Decision:** Use `@fontsource/fraunces` (serif) and `@fontsource/inter` (sans). Subset strictly to Latin files bundled directly by Vite with `font-display: swap`. Zero external runtime network requests.

---

### DEC-012: CSS-First Motion & Zero-CLS Form Architecture
- **Context:** §4.4 requires subtle, magazine-like motion without layout shift or UI jank. Form field validation should not shift lower content when errors trigger.
- **Decision:**
  - Restrict animation properties to `transform` and `opacity` with CSS custom property easing curves.
  - Form fields reserve a dedicated min-height error line slot, preventing layout jumps when validation states change.
  - Skeleton loaders are sized to match the final rendered geometry.
  - Automated tests verify `@media (prefers-reduced-motion: reduce)` overrides all transforms and animations.

---

### DEC-013: Accessible Combobox with Abortable Typeahead
- **Context:** §6 requires accessible place typeahead for city and workplace anchors. Rapid typing can fire overlapping asynchronous geocoding queries resulting in race conditions.
- **Decision:** Implement WAI-ARIA 1.2 Combobox pattern with explicit `role="combobox"`, `role="listbox"`, and `role="option"`. Keydown handling supports full arrow navigation, Enter selection, and Escape dismissal. Place queries are debounced by 200ms and tied to `AbortController` instances to cancel in-flight network requests on rapid keystrokes.

---

### DEC-014: Single-Column Reading-Width Results Layout & Responsive Desktop Map Split
- **Context:** User instruction mandated single-column candidate list at comfortable reading width (~760px) rather than a multi-column grid, ensuring clear rank order and calm progressive streaming during progressive search. Map view on desktop displays side-by-side with the candidate list only when toggled on wide viewports.
- **Decision:** Default results layout is a centered single-column feed capped at 760px. When the user toggles "Map" view mode on viewports $\ge 1024$px, the layout smoothly splits into a 2-column view with the candidate feed on the left (540px) and a sticky interactive map container on the right (1fr).

---

### DEC-015: Dev Playwright Harness for Visual Regression & Honest Rendering Verification
- **Context:** User instruction required verifying real browser screenshots at 360px and 1280px across normal, slow, partial, and sparse-data scenarios into `docs/screens/`, without adding runtime overhead.
- **Decision:** Installed `playwright` strictly as a `devDependency` (zero production bundle cost). Authored `scripts/captureScreens.ts` to spin up headless Chromium, set localStorage mock scenarios, navigate responsive viewports, and capture authentic PNG screenshots into `docs/screens/`. Also verifies honest error states, null handling, and zero browser console errors.

---

### DEC-016: Interactive Weighting Simulator on Method Screen
- **Context:** §7 & LOCUS_UI_PROMPT require explaining the scoring weights and providing an interactive weight preview or clear simulation without modifying the underlying engine.
- **Decision:** Built a reactive simulator component on `/method` which takes the base weights from `engine.method().weights` and projects the effect of priority boosts (1.3× multiplier) and confidence attenuation in real-time on a proportional CSS bar. Zero mutation to engine state occurs.

---

### DEC-017: Standardized Pedestrian Walk-Time Translations for Amenity Radii
- **Context:** Non-technical relocation seekers think in terms of minutes walked rather than abstract meter radii (e.g. 800m vs 1500m).
- **Decision:** Calculate pedestrian walk times assuming standard 5 km/h walking pace (~12 minutes per kilometer), labeling 500m as ~6 min walk, 800m as ~10 min walk, and 1500m as ~18 min walk alongside the exact Overpass query boundary.

---

### DEC-018: Sticky Metric Column and Responsive Matrix Comparison
- **Context:** Comparing multiple candidate localities side-by-side on mobile viewports (e.g., 360px) typically results in either unreadable squished columns or loss of context when scrolling horizontally.
- **Decision:** Compare matrix uses CSS sticky positioning (`position: sticky; left: 0; background: var(--surface); z-index: 2; border-right: 1px solid var(--line-strong)`) on the metric label column (`th:first-child`, `td:first-child`). On narrow screens, metric titles stay permanently pinned in view while the user swipes smoothly across candidate columns. Best-in-category cells are highlighted with subtle editorial tinting and explicit `[✓ Best]` text badges rather than color-only signifiers.

---

### DEC-019: Token-Swap Dark Mode via CSS Custom Properties and User Toggle
- **Context:** §9 / Phase U5 permits dark mode as a token swap if time allows. Users inspecting the UI in low-light environments require high-contrast readability without breaking typography or layout.
- **Decision:** Implemented pure token swap in `tokens.css` mapping `--bg: #1F1D20` and `--ink: #FFF3EB` with full WCAG 2.2 AA and AAA compliance (all text ratios $\ge 7:1$). Added `@media (prefers-color-scheme: dark)` automatic detection alongside manual user toggle button in the header (`document.documentElement.setAttribute("data-theme", theme)`) persisted via `localStorage`.

---

### DEC-020: Self-Contained SVG Cartographic Map with Real Geographic Projections
- **Context:** Third-party raster map libraries (like Leaflet) require external CDN tiles or API keys which fail during offline presentations or hackathon environments, and add ~40 kB gzip to the bundle budget.
- **Decision:** Implemented `LocusMap.tsx` using responsive SVG cartography. Computes exact bounding box from candidate `lat/lon` coordinates with 15% margin padding, rendering workplace diamond pins, candidate rank pills, and connection lines with interactive tooltips and mandatory OpenStreetMap attribution (*"Map data © OpenStreetMap contributors under ODbL"*). Zero API keys, 100% offline resilient, zero external scripts.

---

### DEC-021: Complete Elimination of Legacy Skeleton Stylesheet
- **Context:** Human review condition 1 mandated: *"Keep skeleton.css scoped so the not-yet-migrated screens still function; delete it as each screen is migrated, and make sure it's fully gone by U6."*
- **Decision:** With all 7 user-facing screens and dev tools migrated to scoped token-based stylesheets (`dev.css`, `shell.css`, `results.css`, etc.), `src/ui/skeleton.css` was permanently deleted via `git rm`. Zero legacy monospace styles or un-tokenized CSS rules remain in the repository.

