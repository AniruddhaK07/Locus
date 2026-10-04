# Locus UI Track — Living Progress & Session Handoff Log

**Current Local Time:** 2026-10-04  
**Current Branch:** `ui`  
**Current Phase:** Phase U6 Complete — All UI Phases Finished & PR Ready  

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
   - `npm run check` (typecheck, lint, 18 test suites / 157 unit tests, feature ID guard)
   - `npm run check:features`
4. **Current Status:** Phases U0, U1, U2, U3, U4, U5, and U6 are **100% complete, verified, and tagged**.
5. **Next Target:** Ready to open Pull Request from branch `ui` into target branch!

---

## 2. Phase Execution Matrix

| Phase | Description | Status | Commit / Tag | Test Results |
| :--- | :--- | :--- | :--- | :--- |
| **U0** | Foundation: tokens, fonts, primitives, guards, living docs | **DONE** | Tag `ui-U0` | 13 test suites, 133 tests passed (`check:features` passed) |
| **U1** | Shell, Home, Plan stepper | **DONE** | Tag `ui-U1` | 14 test suites, 135 tests passed; builds cleanly (1.81s) |
| **U2** | Results (streaming, cards, refine, compare bar) | **DONE** | Tag `ui-U2` | 15 test suites, 141 tests passed; Playwright visual screenshots captured |
| **U3** | Area detail and Method | **DONE** | Tag `ui-U3` | 16 test suites, 145 tests passed; Playwright visual screenshots captured |
| **U4** | Compare and Saved | **DONE** | Tag `ui-U4` | 17 test suites, 150 tests passed; Playwright visual screenshots captured |
| **U5** | Polish: responsive, a11y, reduced motion, banners, dev tools | **DONE** | Tag `ui-U5` | 18 test suites, 157 tests passed; Playwright visual screenshots captured |
| **U6** | Final audit, docs, PR-ready | **DONE** | Tag `ui-U6` | 18 test suites, 157 tests passed; `git diff main --stat -- src/engine fixtures` is strictly empty |

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

## 5. Phase U4 Detailed Log

- **Compare Screen (`src/ui/pages/ComparePage.tsx`, `src/ui/styles/compare.css`):**
  - **Header:** Editorial heading in `Fraunces` serif, candidate count subtitle with 3-area maximum guard, and `← Back to Results` button.
  - **Compare Matrix (`data-feature="compare-matrix"`):** Side-by-side metric comparison table with sticky pinned metric column (`th:first-child`, `td:first-child`) enabling smooth mobile horizontal scrolling without losing metric labels.
  - **Candidate Column Headers:** Area name, rank pill, match score, and remove candidate button (`data-feature="remove-area-btn"`).
  - **Metric Comparisons:** Match Score, Peak Commute, Rent Band, Amenities Rating, Safety Infrastructure, and Data Completeness.
  - **Winner Highlighting:** Clear `[✓ Best]` badges and `.winner` tinted cell backgrounds highlighting the top performer per metric.
  - **Quick-Add Selector (`data-feature="add-area-selector"`):** Allows picking saved shortlist items directly into the comparison if $< 3$ areas are currently compared.
  - **Empty State:** Honest guidance when $< 2$ areas are selected, prompting the user to select candidates from Results or Saved.

- **Saved Shortlist Screen (`src/ui/pages/SavedPage.tsx`, `src/ui/styles/saved.css`):**
  - **Header:** Live count badge, `Compare All →` CTA button (`data-feature="compare-selected-btn"`), `Copy Shortlist Link` button with clipboard integration and accessible `Toast` alert, and `Clear All` action.
  - **Saved Locality Cards (`data-feature="saved-item-card"`):** Editorial cards showing rank, locality name, match score in `Fraunces`, candid summary sentence, peak commute with provenance badge, estimated rent band, selection checkbox for comparative analysis, and `Remove` / `Details →` actions.
  - **Empty State:** Informative empty state prompting the user to run a search or return to Results to shortlist localities.

- **Visual Verification & Screenshots:**
  - `docs/screens/compare-desktop.png` (1280px)
  - `docs/screens/compare-360.png` (360px)
  - `docs/screens/saved-desktop.png` (1280px)
  - `docs/screens/saved-360.png` (360px)

---

## 6. Phase U5 Detailed Log

- **Responsive Viewport Audit across 360px, 768px, and 1280px:**
  - All screens audited with Playwright headless browser at 360px mobile, 768px tablet, and 1280px desktop viewports.
  - Zero horizontal overflow on `body` or `html`. Full touch-target accessibility ($\ge 44$px for touch controls).
  - Screenshots recorded: `home-768.png`, `plan-768.png`, `results-768.png`, `area-768.png`, `compare-768.png`, `saved-768.png`.

- **Dark Mode Implementation & WCAG 2.2 AA Contrast Verification:**
  - Rich espresso-charcoal palette (`--bg: #1F1D20`, `--ink: #FFF3EB`).
  - Automated mathematical luminance tests in `tests/responsiveAndA11y.test.tsx` confirm:
    - Primary text (`--ink`): **15.42:1** (exceeds AAA $\ge 7:1$)
    - Muted captions & provenance badges (`--ink-muted`): **7.37:1** (exceeds AAA $\ge 7:1$)
    - Error messages (`--danger`): **5.40:1** (passes AA $\ge 4.5:1$)
    - High confidence marks (`--ok`): **6.19:1** (passes AA $\ge 4.5:1$)
    - Interactive borders (`--line-strong`): **3.08:1** (passes UI Component $\ge 3:1$)
  - System preference detection via `@media (prefers-color-scheme: dark)` plus manual toggle button (`data-feature="theme-toggle"`) in the global header with `localStorage` persistence.
  - Screenshots recorded: `results-dark-desktop.png`, `results-dark-360.png`.

- **Cartographic SVG Map (`LocusMap.tsx`, `src/ui/styles/map.css`):**
  - Fully responsive, self-contained SVG coordinate space with 15% safety padding.
  - Real geographic `lat/lon` projection for candidate localities and workplace diamond pin.
  - Interactive pin hover tooltips and keyboard activation (`tabIndex={0}`, Enter/Space).
  - Mandatory OpenStreetMap attribution: *"Map data © OpenStreetMap contributors under ODbL"*.
  - 100% offline demo resilience: zero external network dependencies, zero API keys.
  - Screenshot recorded: `results-map-view-desktop.png`.

- **Complete Elimination of Legacy Skeleton Stylesheet:**
  - `src/ui/skeleton.css` permanently deleted via `git rm`.
  - Replaced with scoped token-based `src/ui/styles/dev.css` for dev utilities.
  - Automated test confirms `skeleton.css` does not exist on disk or in `App.tsx`.

- **Mode Banners & Dev Tools Gating:**
  - `ModeBanner` verified across mock ("Sample data"), snapshot ("Recorded demo data · captured ..."), and live (null / calm).
  - Dev tools gated in production via `isDevMode()` (`import.meta.env.DEV`, `?dev=1`, `locus_dev=1`).

- **Production Bundle Metrics:**
  - Total CSS gzip: **7.92 kB**
  - Total JS gzip: **135.17 kB** (including full engine, algorithms, mock data, and all screens)
  - Vite production build time: **1.87s**

---

## 7. Phase U6 Detailed Log (Final Audit & Handoff)

- **Engine & Fixtures Strict Boundary Verification:**
  - `git diff main --stat -- src/engine fixtures` is **strictly empty** (0 insertions, 0 deletions, 0 files changed).
  - Presentation layer consumes the engine exclusively via `@engine` public API contract.

- **Hex Literal Audit:**
  - Verified across all `.tsx`, `.ts`, and `.css` files in `src/ui/`.
  - Zero hex color codes exist outside `src/ui/styles/tokens.css`.
  - Automated test in `tests/responsiveAndA11y.test.tsx` prevents regression.

- **Legacy Wireframe Stylesheet Elimination:**
  - `src/ui/skeleton.css` was permanently deleted via `git rm`.
  - Zero legacy un-tokenized classes or monospace body styling remain.

- **Living Documentation Reconciliation:**
  - `README.md` updated with comprehensive UI presentation layer guide, screenshots, and test instructions.
  - `docs/UI_DESIGN.md` updated with dark mode contrast verification table, responsive breakpoints, and cartographic map specifications.
  - `docs/DECISIONS.md` updated with DEC-014 through DEC-021.
  - `docs/UI_PROGRESS.md` fully reconciled to Phase U6.

- **Automated Verification:**
  - `npm run check` (typecheck + ESLint + Vitest): **18 test suites, 157 unit tests passed**.
  - `npm run check:features`: All contract handles verified intact.
  - `npm run build`: Production build passes in 1.87s.

- **Visual Artifacts:**
  - 28 high-resolution authentic Playwright screenshots recorded in `docs/screens/` covering mobile (360px), tablet (768px), desktop (1280px), slow/partial/sparse-data scenarios, map view, and dark mode.

---

## 8. Contract Feature Preservation Log

All contract handles from `UI_CONTRACT.md` maintained and verified:
- `app-shell`, `nav-home`, `nav-plan`, `nav-results`, `nav-saved`, `nav-method`, `main-nav`, `theme-toggle`
- `step-1-panel`, `city-input`, `workplace-input`, `city-suggestions`, `workplace-suggestions`
- `step-2-panel`, `transport-select`, `max-commute-input`
- `step-3-panel`, `budget-min-input`, `budget-max-input`, `household-select`, `priority-select`
- `results-screen`, `pipeline-progress-panel`, `area-list`, `area-card`, `map-placeholder`, `view-toggle`, `sort-select`, `filter-panel`, `compare-sticky-bar`
- `area-detail-screen`, `area-header`, `back-btn`, `save-toggle-btn`, `score-table`, `commute-breakdown`, `amenity-grid`, `rent-panel`, `safety-panel`, `portal-links`
- `method-screen`, `weights-table`, `radii-table`, `routing-profiles-table`, `confidence-legend`, `limitations-list`
- `compare-screen`, `compare-matrix`, `remove-area-btn`, `add-area-selector`
- `saved-screen`, `compare-selected-btn`, `saved-item-card`
- `scenario-switcher`, `scenario-select`, `mode-banner`, `dev-map-screen`

---

## 9. Known Gaps & Engine Notes

- None. All 18 test suites and 157 tests pass; production bundle builds cleanly. Ready for human review and pull request merge.


