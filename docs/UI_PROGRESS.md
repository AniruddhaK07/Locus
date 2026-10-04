# Locus UI Track — Living Progress & Session Handoff Log

**Current Local Time:** 2026-10-04  
**Current Branch:** `ui`  
**Current Phase:** Phase U2 Complete — Results Screen & Streaming Integration  

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
   - `npm run check` (typecheck, lint, 15 test suites / 141 unit tests, feature ID guard)
   - `npm run check:features`
4. **Current Status:** Phase U0 (Foundation & Primitives), Phase U1 (App Shell, Home, Plan Stepper), and Phase U2 (Results Screen, Streaming, Cards, Refine, Compare Bar) are **100% complete, verified, and tagged**.
5. **Next Target (Phase U3):** Area Detail screen (`/area/:id`) and Method explanation screen (`/method`).

---

## 2. Phase Execution Matrix

| Phase | Description | Status | Commit / Tag | Test Results |
| :--- | :--- | :--- | :--- | :--- |
| **U0** | Foundation: tokens, fonts, primitives, guards, living docs | **DONE** | Tag `ui-U0` | 13 test suites, 133 tests passed (`check:features` passed) |
| **U1** | Shell, Home, Plan stepper | **DONE** | Tag `ui-U1` | 14 test suites, 135 tests passed; builds cleanly (1.81s) |
| **U2** | Results (streaming, cards, refine, compare bar) | **DONE** | Tag `ui-U2` | 15 test suites, 141 tests passed; Playwright visual screenshots captured |
| **U3** | Area detail and Method | PENDING | — | — |
| **U4** | Compare and Saved | PENDING | — | — |
| **U5** | Polish: responsive, a11y, reduced motion, banners, dev tools | PENDING | — | — |
| **U6** | Final audit, docs, PR-ready | PENDING | — | — |

---

## 3. Human Review Feedback Addressed (U1 → U2)

1. **Monospace font bleed resolved:** Scoped legacy wireframe `skeleton.css` strictly to unmigrated screens/classes (`.box`, `.grid`, `.badge`, etc.). Removed blanket `body { font-family: monospace; }`, `nav`, and `button` rules so `Inter` applies globally across all text, links, buttons, and inputs.
2. **Wordmark & Hero Alignment:** Removed centered width constraint (`margin: 0 auto; max-width: 820px`) from `.locus-home`; hero content now aligns to the same horizontal gutter (`1.5rem`) as the Header brand wordmark.
3. **Button Motion:** Tightened primary button hover trailing arrow slide from 4px to 2px (`transform: translateX(2px)`).
4. **Results Layout:** Strictly single-column candidate list at comfortable reading width (~760px). When Map view is toggled on wide viewports ($\ge 1024$px), candidate feed and sticky map render cleanly side by side.
5. **Real Visual Rendering & Screenshots:** Installed `playwright` (devDependency only, 0 production bundle weight). Created `scripts/captureScreens.ts` and successfully captured 13 full-color screenshots at 1280px and 360px viewports in `docs/screens/`:
   - `home-desktop.png`, `home-360.png`
   - `plan-desktop.png`, `plan-360.png`
   - `results-normal-desktop.png`, `results-normal-360.png`
   - `results-slow-desktop.png`, `results-slow-360.png` (demonstrating stepped pipeline progress badges and skeleton placeholders)
   - `results-partial-desktop.png`, `results-partial-360.png` (demonstrating partial search warning and dropped area count)
   - `results-sparse-data-desktop.png`, `results-sparse-data-360.png` (demonstrating explicit "Insufficient data" badges and honest OSM lack-of-tagging explanations)
   - `results-map-view-desktop.png` (demonstrating side-by-side reading-width candidate list and map pane)
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

## 4. Phase U2 Detailed Log

- **Query Summary Bar:**
  - Displays formatted search criteria: City, Workplace, transport mode, max commute, budget ceiling.
  - "Copy link" action with transient accessible toast confirmation (`Toast`).
  - "Edit" action navigating back to `/plan`.
- **Progressive Pipeline Progress Bar (`PipelineProgress.tsx`):**
  - Smooth 2px horizontal progress line (`scaleX` transform).
  - Live stage chips: `Resolving City`, `Discovering Localities`, `Routing Commutes`, `Profiling Amenities`, `Calibrating Scores`.
  - Seamless transition from loading state into a calm, compact 1-line summary upon completion (`✓ Search complete · Discovered and ranked N localities`).
- **Candid Candidate Area Cards (`AreaCard.tsx`):**
  - Rank `#N` and area name in display serif linking to `/area/:id`.
  - Confidence mark glyph (`ConfidenceMark` with full honesty: solid circle for high, half-filled for medium, hollow ring for low).
  - Match score in prominent display serif (`matchScore`) with accompanying data completeness readout (`Based on X% of available data`).
  - 3 factual chips highlighting commute, local amenities, and rent estimates.
  - Structured metric blocks for Commute (with `ProvenanceBadge`), Estimated Rent Band ("Not listing data"), and Safety Indicator ("Infrastructure indicator, not crime data").
  - Sparse Data Resilience: When safety data is null, displays explicit `"Insufficient data"` with the specific reason (`"Insufficient OSM streetlamp or police tagging in this sector"`).
  - Actions: Compare checkbox with accessible label, bookmark button connected reactively to `engine.saved`, and "Details →" button.
- **Refinement & Filter Drawer (`RefineDisclosure.tsx`):**
  - Accessible disclosure pattern (`aria-expanded`, smooth grid-template-rows expansion).
  - Sort selector (Overall Match, Shortest Commute, Lowest Rent, Highest Amenities).
  - Commute slider (15 to 90 min) with live tabular readout.
  - Minimum match score slider (0% to 100%).
  - "Hide low-confidence results" checkbox toggle.
  - All sorting and filtering driven by pure engine function `selectAreas`.
- **Sticky Compare Bar (`CompareStickyBar.tsx`):**
  - Slides up from screen bottom when 1+ candidates are selected.
  - Live badge counter (`N selected`).
  - "Compare →" primary CTA navigating to `/compare?ids=...`.
  - "Clear" button to deselect all.
- **Side-by-Side Responsive Map Toggle:**
  - Segmented control toggle between "List" and "Map".
  - On wide viewports ($\ge 1024$px), candidate feed stays at reading width on the left while the map container expands into the right column.

---

## 5. Contract Feature Preservation Log

All contract handles from `UI_CONTRACT.md` maintained and verified:
- `results-screen`, `pipeline-progress`, `pipeline-stage`, `query-summary`, `copy-link-btn`, `edit-plan-btn`
- `view-toggle`, `refine-toggle`, `sort-select`, `filter-commute`, `filter-confidence`
- `area-list`, `area-card`, `area-rank`, `match-score`, `confidence-mark`, `key-facts`, `provenance-badge`
- `save-area-btn`, `compare-checkbox`, `view-details-btn`
- `compare-bar`, `compare-count`, `compare-submit-btn`, `load-more-btn`
- `empty-results`, `partial-data-banner`, `results-map`

---

## 6. Known Gaps & Engine Notes

- None. All 15 test suites and 141 tests pass; production bundle builds cleanly.
