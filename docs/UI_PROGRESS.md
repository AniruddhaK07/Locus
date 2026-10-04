# Locus UI Track — Living Progress & Session Handoff Log

**Current Local Time:** 2026-10-04  
**Current Branch:** `ui`  
**Current Phase:** Phase U0 Complete / Ready for Phase U1  

---

## 1. Resume Here (Fresh Agent Quickstart)

If starting a new session or resuming after a break:
1. **Verify Branch:** `git branch --show-current` must be `ui`. Stop if not.
2. **Read Contract & Authority:**
   - Contract: `docs/UI_CONTRACT.md`
   - Authority: `src/engine/domain/types.ts` wins on any conflict (e.g., `dataCompleteness` is 0–1).
   - Design System: `docs/UI_DESIGN.md`
   - Prompt specs: `docs/UI_MASTER_PROMPT.md`
3. **Run Health Checks:**
   - `npm run check` (typecheck, lint, all unit tests, feature ID guard)
   - `npm run check:features`
4. **Current Status:** Phase U0 (Foundation & Primitives) is **100% complete and verified**. Proceed with Phase U1: App Shell, Home Page, and Plan Stepper.
5. **Phase U1 Target:** Build app shell (header, footer, route transition), `/` Home page, and `/plan` 3-step stepper with accessible combobox, chips, and validation.

---

## 2. Phase Execution Matrix

| Phase | Description | Status | Commit / Tag | Test Results |
| :--- | :--- | :--- | :--- | :--- |
| **U0** | Foundation: tokens, fonts, primitives, guards, living docs | **DONE** | Tag `ui-U0` | 13 test suites, 133 tests passed (`check:features` passed) |
| **U1** | Shell, Home, Plan stepper (**checkpoint**) | **PENDING** | — | — |
| **U2** | Results (streaming, cards, refine, compare bar) | PENDING | — | — |
| **U3** | Area detail and Method | PENDING | — | — |
| **U4** | Compare and Saved | PENDING | — | — |
| **U5** | Polish: responsive, a11y, reduced motion, banners, dev tools | PENDING | — | — |
| **U6** | Final audit, docs, PR-ready | PENDING | — | — |

---

## 3. Phase U0 Detailed Log

- **Environment & Branch:** Confirmed active branch `ui`. Copied `LOCUS_UI_PROMPT.md` to `docs/UI_MASTER_PROMPT.md`.
- **Self-Hosted Typography:** Installed `@fontsource/fraunces` and `@fontsource/inter`. Loaded Latin subsets in `src/ui/main.tsx` with zero runtime CDN dependencies.
- **Design Tokens:** Built `src/ui/styles/tokens.css` with 100% token coverage (colors, fluid typography clamp scales, 4px spacing scale, motion tokens, dark-mode ready variables).
- **Measured Contrast Ratios:** Calculated exact relative luminance contrast ratios for all color tokens. Text against `--bg` achieves 13.04:1 (`--ink`) and 5.28:1 (`--ink-muted`); `--line-strong` passes 3.10:1 for UI components. Recorded in `docs/UI_DESIGN.md`.
- **Primitives Suite:** Implemented 16 primitive components in `src/ui/primitives/`:
  - `Button` (primary sweep animation, secondary, ghost, loading progress line, disabled, active scale)
  - `IconButton` (toggle active pulse, accessible labels)
  - `Field` (reserved validation error line to guarantee 0 CLS, accessible descriptions)
  - `Select` (accessible select with custom SVG chevron)
  - `Slider` (accessible range with tabular numeric readout)
  - `Chip` (compact pill with accessible remove trigger)
  - `ConfidenceMark` (high ●, medium ◐, low ○, none ⊘ without color dependence)
  - `ProvenanceBadge` (source, confidence, tooltip with capture date and notes, null handling)
  - `Card` (hairline border, hover lift translateY(-1px))
  - `Skeleton` (pulsing shimmer matching final dimensions)
  - `Disclosure` (accessible trigger with 90deg rotating chevron)
  - `Tooltip` (pure CSS accessible hover & focus-within popup)
  - `Toast` (polite region, auto-dismiss feedback)
  - `EmptyState` (calm one sentence + one action)
  - `ErrorState` (terracotta error boundary with retry trigger)
  - `ModeBanner` (sample data in mock, recorded capture date in snapshot, hidden in live)
- **Feature ID Guard (`check:features`):** Built `tests/featureGuard.test.tsx` verifying every screen and all contract-required `data-feature` handles. Added `"check:features"` to `package.json` and integrated into `npm run check`.
- **Dev Showcase:** Created `src/ui/pages/PrimitivesPage.tsx` accessible at `/primitives` and listed in `DevMapPage.tsx`.

---

## 4. Contract Feature Preservation Log

- All 65+ feature IDs from `UI_CONTRACT.md` are mapped and verified by automated test `check:features`.
- No feature IDs were removed or altered.

---

## 5. Known Gaps & Engine Notes

- None. Engine mock, snapshot, and live contracts are working as expected without requiring engine changes at this stage.
