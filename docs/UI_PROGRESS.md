# Locus UI Track — Living Progress & Session Handoff Log

**Current Local Time:** 2026-10-04  
**Current Branch:** `ui`  
**Current Phase:** Phase U3 Complete — Area Detail & Method Screens  

---

## 1. Resume Here (Fresh Agent Quickstart)

If resuming after this checkpoint:
1. **Verify Branch:** `git branch --show-current` must be `ui`. Stop if not.
2. **Read Contract & Authority:**
   - Contract: `docs/UI_CONTRACT.md`
   - Authority: `src/engine/domain/types.ts` wins on any conflict (e.g., `dataCompleteness` is 0–1).
   - Design System: `docs/UI_DESIGN.md`
   - Prompt specs: `docs/UI_MASTER_PROMPT.md`
3. **Run Health Checks:**
   - `npm run check` (typecheck, lint, 16 test suites / 145 unit tests, feature ID guard)
   - `npm run check:features`
4. **Current Status:** Phases U0, U1, U2, and U3 are **100% complete, verified, and tagged**.
5. **Next Target (Phase U4):** Compare screen (`/compare?ids=...`) with side-by-side metric matrix & winner indicators, and Saved Shortlist screen (`/saved`) with persistent state & compare shortcuts.

---

## 2. Phase Execution Matrix

| Phase | Description | Status | Commit / Tag | Test Results |
| :--- | :--- | :--- | :--- | :--- |
| **U0** | Foundation: tokens, fonts, primitives, guards, living docs | **DONE** | Tag `ui-U0` | 13 test suites, 133 tests passed (`check:features` passed) |
| **U1** | Shell, Home, Plan stepper | **DONE** | Tag `ui-U1` | 14 test suites, 135 tests passed; builds cleanly (1.81s) |
| **U2** | Results (streaming, cards, refine, compare bar) | **DONE** | Tag `ui-U2` | 15 test suites, 141 tests passed; Playwright visual screenshots captured |
| **U3** | Area detail and Method | **DONE** | Tag `ui-U3` | 16 test suites, 145 tests passed; Playwright visual screenshots captured |
| **U4** | Compare and Saved | PENDING | — | — |
| **U5** | Polish: responsive, a11y, reduced motion, banners, dev tools | PENDING | — | — |
| **U6** | Final audit, docs, PR-ready | PENDING | — | — |

---

## 3. Human Review Feedback Addressed (U1 → U2)

1. **Monospace font bleed resolved:** Scoped legacy wireframe `skeleton.css` strictly to unmigrated screens/classes (`.box`, `.grid`, `.badge`, etc.). Removed blanket `body { font-family: monospace; }`, `nav`, and `button` rules so `Inter` applies globally across all text, links, buttons, and inputs.
2. **Wordmark & Hero Alignment:** Removed centered width constraint (`margin: 0 auto; max-width: 820px`) from `.locus-home`; hero content now aligns to the same horizontal gutter (`1.5rem`) as the Header brand wordmark.
3. **Button Motion:** Tightened primary button hover trailing arrow slide from 4px to 2px (`transform: translateX(2px)`).
4. **Results Layout:** Strictly single-column candidate list at comfortable reading width (~760px). When Map view is toggled on wide viewports ($\ge 1024$px), candidate feed and sticky map render cleanly side by side.
5. **Real Visual Rendering & Screenshots:** Installed `playwright` (devDependency only, 0 production bundle weight). Created `scripts/captureScreens.ts` and captured authentic 1280px and 360px screenshots in `docs/screens/`.
6. **WCAG 2.2 Contrast Verification:**
   - `--ink` (`#2C2A2E`) on `--bg` (`#FFF3EB`): **13.04:1** (exceeds AAA $\ge 7:1$)
   - `--ink-muted` (`#6B6469`) on `--bg`: **5.28:1** (passes AA $\ge 4.5:1$)
   - `--danger` (`#A84A36`) on `--bg`: **5.21:1** (passes AA $\ge 4.5:1$)
   - `--ok` (`#4F6B53`) on `--bg`: **5.41:1** (passes AA $\ge 4.5:1$)
   - `--line-strong` (`#9C8783`) on `--bg`: **3.10:1** (passes UI Component AA $\ge 3:1$)
7. **Font Payload & Preload Optimizations:**
   - Preloaded above-the-fold files directly in `index.html`: `fraunces-latin-600-normal.woff2` (18.1 kB) and `inter-latin-400-normal.woff2` (23.7 kB). Total preloaded: 41.8 kB.
   - Dropped unused `fraunces-latin-400` font weight, eliminating ~40.5 kB.
   - Remaining fonts bundled: `inter-latin-500` (24.3 kB) and `inter-latin-600` (24.5 kB). Total package: 90.6 kB.
8. **Query String Equivalence:**
   - Verified via `tests/planStepper.test.tsx` that the stepper produces identical URL query parameters to the Phase 1 wireframe: `city`, `wpName`, `wpLat`, `wpLon`, `mode`, `maxCommute`, `budgetMax`, `budgetMin`, `household`, `priority`.
9. **Keyboard & Focus Trap Audit:**
   - Verified that neither the Stepper nor Combobox has focus traps. Tab cycles naturally into, across, and past all fields. Escape closes dropdown suggestions without trapping focus.

---

## 4. Phase U3 Detailed Log

- **Area Detail Screen (`src/ui/pages/AreaDetailPage.tsx`, `src/ui/styles/detail.css`):**
  - **Header:** Back button (`← Back to Results`), OSM ID badge pill, Locality title in display serif `Fraunces` with `ConfidenceMark`, and Save toggle button.
  - **Match Score Hero:** Match score in `Fraunces` (`matchScore`) with verified data completeness percentage and heuristic formula provenance badge.
  - **Editorial Narrative:** Plain-English summary explaining the score derivation.
  - **Score Criteria Table (`data-feature="score-table"`):** Transparent breakdown of all scoring factors showing points assigned, max points, effective weight percentage, raw measured metric, and provenance badge with notes.
  - **Commute Deep-Dive (`data-feature="commute-breakdown"`):** Cards for each configured destination comparing free-flow OSM road network duration with peak congestion estimates, route distance, transport mode, and max commute alerts.
  - **Amenity Grid & Walking Access (`data-feature="amenity-grid"`):** Direct counts from OpenStreetMap query buffers mapped to walking time estimates at 5 km/h:
    - Groceries & Daily (800m, ~10 min walk)
    - Food & Dining (800m, ~10 min walk)
    - Healthcare & Clinics (1500m, ~18 min walk)
    - Schools & Education (1500m, ~18 min walk)
    - Parks & Leisure (1500m, ~18 min walk)
    - Transit Stops (Bus 500m, Rail/Metro 1500m)
  - **Rent Band & User Override (`data-feature="rent-panel"`):**
    - Estimated Market Band in ₹ with disclaimer: *"Estimated market tier-band from city calibration, not live listing portal data."*
    - Interactive user rent override input and "Save Rent Override" button.
    - Rescoring feedback confirming rent confidence promotion to high (user-verified).
  - **Safety Infrastructure Panel (`data-feature="safety-panel"`):**
    - Mandatory physical disclaimer: *"Disclaimer: This is an OSM infrastructure indicator based on physical features, not police crime data."*
    - Physical infrastructure score (e.g. `10 / 10` or `"Insufficient data"` with reason).
    - Breakdown of physical counts: Police stations within 1500m, Lit roads count tagged in OSM, Surveillance & CCTV nodes, and sector coverage notes.
  - **Interactive Map Placeholder (`data-feature="map-placeholder"`):** Centroid coordinates and geometry indicator.
  - **Verified Rental Portal Listings (`data-feature="portal-links"`):** Outbound buttons to MagicBricks, Housing.com, 99acres, and universal Google Search fallback with working query parameters.
  - **States:** Zero-CLS skeleton state during loading, empty/not-found state with back navigation, and `sparse-data` state when data completeness is under 60%.

- **Methodology Screen (`src/ui/pages/MethodPage.tsx`, `src/ui/styles/method.css`):**
  - **Scoring Formulas & Explanation:** Clear statement that Locus uses zero black-box AI models for scoring.
  - **Interactive Weighting Simulator:** Allows users to simulate priority presets (Balanced, Commute, Budget, Amenities, Safety) and see real-time shifts in relative weighting on a proportional bar without mutating engine state.
  - **Base Weights & Attenuation Table (`data-feature="weights-table"`):** Full disclosure of criteria, base weights, and confidence factors (High 1.0×, Medium 0.7×, Low 0.35×, None 0.0×).
  - **Renormalization Rule:** Clear explanation that missing data attenuates criterion influence rather than substituting fake defaults.
  - **Query Radii Table (`data-feature="radii-table"`):** Radii in meters matched to estimated walking minutes and target OSM tags.
  - **Routing Profiles Table (`data-feature="routing-profiles-table"`):** Status badges (Available / Unavailable), provider hosts, and direct vs heuristic engine types.
  - **Confidence Legend (`data-feature="confidence-legend"`):** Cards explaining `osm`, `routing`, `heuristic`, `user`, and `unavailable` provenance tags.
  - **Honest Limitations List (`data-feature="limitations-list"`):** Caveats regarding traffic heuristics, listing scraper absences, physical safety tags, and geographic OSM density variance.

- **Visual Verification & Screenshots:**
  - `docs/screens/area-desktop.png` (1280px)
  - `docs/screens/area-360.png` (360px)
  - `docs/screens/method-desktop.png` (1280px)
  - `docs/screens/method-360.png` (360px)

---

## 5. Contract Feature Preservation Log

All contract handles from `UI_CONTRACT.md` maintained and verified:
- `area-detail-screen`, `area-header`, `back-btn`, `save-toggle-btn`
- `match-score`, `explanation-text`, `score-table`, `criterion-row`
- `commute-breakdown`, `commute-card`, `amenity-grid`, `amenity-count-card`
- `rent-panel`, `rent-override-input`, `save-rent-btn`
- `safety-panel`, `safety-disclaimer`, `map-placeholder`
- `portal-links`, `portal-link-btn`
- `method-screen`, `weights-table`, `radii-table`, `routing-profiles-table`, `confidence-legend`, `limitations-list`

---

## 6. Known Gaps & Engine Notes

- None. All 16 test suites and 145 tests pass; production bundle builds cleanly.
