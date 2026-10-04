# Locus UI Track — Living Progress & Session Handoff Log

**Current Local Time:** 2026-10-04  
**Current Branch:** `ui`  
**Current Phase:** Phase U1 Complete (**CHECKPOINT REACHED** — Waiting for Human Review)  

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
   - `npm run check` (typecheck, lint, 14 test suites / 135 unit tests, feature ID guard)
   - `npm run check:features`
4. **Current Status:** Phase U0 (Foundation & Primitives) and Phase U1 (App Shell, Home, Plan Stepper) are **100% complete, verified, and tagged**.
5. **Next Target (Phase U2):** Results screen (`/results`): progressive streaming pipeline panel, candid area cards with match scores and honesty badges, refine disclosure (sort & filters), map placeholder/toggle, sticky compare bar, load more, empty/partial/error states.

---

## 2. Phase Execution Matrix

| Phase | Description | Status | Commit / Tag | Test Results |
| :--- | :--- | :--- | :--- | :--- |
| **U0** | Foundation: tokens, fonts, primitives, guards, living docs | **DONE** | Tag `ui-U0` | 13 test suites, 133 tests passed (`check:features` passed) |
| **U1** | Shell, Home, Plan stepper (**checkpoint**) | **DONE** | Tag `ui-U1` | 14 test suites, 135 tests passed; builds cleanly (1.81s) |
| **U2** | Results (streaming, cards, refine, compare bar) | PENDING | — | — |
| **U3** | Area detail and Method | PENDING | — | — |
| **U4** | Compare and Saved | PENDING | — | — |
| **U5** | Polish: responsive, a11y, reduced motion, banners, dev tools | PENDING | — | — |
| **U6** | Final audit, docs, PR-ready | PENDING | — | — |

---

## 3. Phase U1 Detailed Log

- **App Shell (`src/ui/components/Header.tsx`, `Footer.tsx`, `src/ui/styles/shell.css`):**
  - Refined wordmark "Locus" at left in `Fraunces` serif.
  - Right navigation: Plan, Results, Saved (with live count badge), How it works. Dev links (`[Dev Map]`, `[Primitives]`) conditionally rendered via `isDevMode()`.
  - Mode banner integration (`ModeBanner` rendered unobtrusively above bar in mock and snapshot modes).
  - Editorial footer linking to methodology, saved shortlist, and dev catalog.
  - Route crossfade animation (200ms `transform: translateY(4px) -> 0` and opacity fade).
- **Home Screen (`src/ui/pages/HomePage.tsx`, `src/ui/styles/home.css`):**
  - Serif headline: **"Find where to live."**
  - Supporting line: **"Neighbourhoods ranked by commute, amenities and budget, with the source of every number."**
  - Primary button: **"Start"** with coral hover sweep and sliding trailing arrow.
  - Quiet secondary link: **"Resume last search"** rendered only when cached preferences exist in `localStorage`.
  - Staggered entrance animation (4 steps, total duration <= 400ms).
  - Subtle geometric line-art motif (5% opacity).
  - Zero marketing superlatives, zero fake counters.
- **Plan Stepper (`src/ui/pages/PlanPage.tsx`, `src/ui/components/Combobox.tsx`, `src/ui/styles/plan.css`):**
  - 3-segment thin progress indicator at top with active/completed styling.
  - **Step 1 (City & Workplace):** Accessible ARIA combobox pattern (`combobox`, `listbox`, `option`, arrow navigation, Enter selection, Escape dismiss). Debounced (200ms) with `AbortController` cancellation. Selections convert to removable chips with accessible remove buttons.
  - **Step 2 (Transit & Commute):** Transport selector populated dynamically from `engine.method().routingProfiles`, displaying available modes and labeling heuristic ones as estimates. One-way commute slider with live tabular readout. Secondary destination configuration (up to 3 destinations) with add/remove actions.
  - **Step 3 (Budget & Household):** Target and maximum budget inputs formatted in Indian currency (`₹`, `Intl.NumberFormat("en-IN")`). Household composition segmented control (`balanced`, `student`, `couple`, `family`). Priority focus select.
  - **Navigation & Validation:** Dedicated error line slot preventing any layout shift (0 CLS). Enter advances steps. Submitting serializes preferences via `engine.prefsToQuery` and navigates to `/results?<query>`.
- **Verification:** Added `tests/planStepper.test.tsx` verifying exact serialization compatibility with `engine.queryToPrefs`. All 135 tests passing.

---

## 4. Contract Feature Preservation Log

All contract handles from `UI_CONTRACT.md` maintained and verified:
- `home-screen`, `app-title`, `value-statement`, `start-btn`, `resume-search-btn`
- `plan-screen`, `step-1-panel`, `city-input`, `city-suggestions`, `city-select-btn`, `city-chip`, `workplace-input`, `workplace-suggestions`, `workplace-select-btn`, `workplace-chip`
- `step-2-panel`, `transport-select`, `max-commute-input`, `add-dest-btn`, `dest-row`, `remove-dest-btn`
- `step-3-panel`, `budget-min-input`, `budget-max-input`, `household-select`, `priority-select`
- `step-back-btn`, `step-next-btn`, `submit-search-btn`, `validation-error`

---

## 5. Known Gaps & Engine Notes

- None.
