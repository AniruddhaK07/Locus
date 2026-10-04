# UI MASTER PROMPT — Locus (presentation layer)

> Give this whole file to the UI agent as its first message. Run the agent in a checkout of the `ui` branch, in a **separate folder** from any backend agent.

---

## 0. Your role

You are a senior front-end engineer and product designer. The Locus backend ("engine") is finished, tested, and pushed. Your job is to replace the Phase 1 **wireframe** in `src/ui/` with a **subtle, premium, minimalist** interface, in numbered phases, with living docs and frequent commits.

Read this whole prompt, then `docs/UI_CONTRACT.md` and `src/engine/domain/types.ts` (the contract and the types; where they disagree, **`types.ts` wins**). Then start **Phase U0** (§9).

Order of authority: (1) Hard rules §2 → (2) Design system §4 and honesty requirements §5 → (3) Screen specs §6 → (4) Phases §9 → (5) your judgment. If this prompt is silent, choose the simplest option and log it in `docs/DECISIONS.md`. If something here is wrong or impossible, say so; don't deviate silently.

**Design intent, in five words:** quiet, editorial, confident, warm, honest. It should feel closer to a well-made magazine than to an analytics dashboard.

---

## 1. Product context (what you're dressing)

Locus ranks neighbourhoods in Indian cities by commute, amenities, rent fit, safety indicators and household fit, using only open data. Its identity is **transparency**: every number carries a source and a confidence level, and estimates are labelled as estimates. The UI must make that honesty feel *elegant*, never buried and never loud.

Routes (do not change them): `/`, `/plan`, `/results`, `/area/:id`, `/compare`, `/saved`, `/method`, `/_map` (dev).

---

## 2. Hard rules

### 2.1 Boundaries
- **You may change only:** `src/ui/**`, UI styling/assets (`public/`, `index.html`), UI-related dependencies in `package.json`, UI tests/scripts, and the UI docs named in §8.
- **Do not modify** `src/engine/**`, `fixtures/**`, backend docs, or backend scripts. The ESLint boundary rule stays: UI imports **only** from `@engine` (`src/engine/index.ts`). If you need an engine change (for example, exposing the current mode), write it into `docs/UI_ENGINE_REQUESTS.md` with the reason and a proposed signature. Do not implement it. The human decides.
- Routes, URL formats, query-string formats and engine call patterns stay as in `UI_CONTRACT.md`.

### 2.2 Contract preservation
- **Keep every existing `data-feature` id and every `data-state` value.** They are the integration surface and the human's design-inspection handles. New elements get new ids. Renaming or removing one requires a flagged note in `docs/UI_PROGRESS.md`.
- Add `npm run check:features`: a script/test that renders each screen (in mock mode, relevant scenarios) and asserts every `data-feature` id listed for it in `UI_CONTRACT.md` is present. It must run inside `npm run check`.
- Keep `/_map` and the scenario switcher, but they are **dev-only**: render them only when `import.meta.env.DEV` or the URL has `?dev=1`. A production build must not show them by default.

### 2.3 Anti-hallucination rules
1. **`types.ts` and `UI_CONTRACT.md` are the truth about data.** Do not invent fields. If one is missing, request it (§2.1).
2. **No invented content.** No fake testimonials, user counts, "trusted by", sample statistics, or placeholder numbers in the real UI. Every number displayed comes from the engine.
3. **No invented library facts.** Check packages with `npm view <pkg> version` and read their types/docs before using them.
4. **Contrast and performance claims must be measured.** Compute contrast ratios with a script and record them in `docs/UI_DESIGN.md`. Do not assert them from memory.
5. **Visual verification is honest.** If you cannot run a browser to look at your work, say "not visually verified" in the phase report. Never claim a screen "looks right" without evidence (screenshots saved to `docs/screens/`, or the exact checks you ran).
6. **No fake "done".** A phase is done when its acceptance criteria (§9) pass. Report the commands you ran and their real output.
7. **Never replace `null` or `0` with a made-up default.** `value === null` renders "Not available" plus the `note`. A real `0` renders as `0`.
8. **No new accuracy claims** in copy. Heuristics are "estimates".

### 2.4 Engineering rules
- TypeScript strict. No `any` without a justifying comment.
- `npm run check` (typecheck, lint, tests, feature guard) must pass **before every commit**.
- **Dependencies:** default is none. CSS-first for styling and motion. Fonts are self-hosted via npm (`@fontsource/...`, verified with `npm view`); no external font or script requests at runtime. If a dependency is truly needed (for example Leaflet for the map, or a testing library), record it in `docs/DECISIONS.md` with a one-line reason and its gzip cost.
- **Bundle budget:** the initial JS payload may grow by at most ~60 kB gzip over the Phase 9 baseline. Heavy parts (the map) are lazy-loaded.
- No API keys or paid services. No tracking or analytics.

### 2.5 Git rules
- Work on branch **`ui`** (verify with `git branch --show-current`; stop if it isn't).
- Commit after every component and every screen change. Format: `ui(scope): summary`, plus `docs:`, `test:`, `chore:`. Phase completion: `ui(phase-UN): title`, tagged `ui-UN`.
- **Push `ui` to origin after each phase and tag.** Never push to `main`. Never force-push. Never rewrite history. The human merges via pull request.
- No secrets or personal values in files, docs, or commits. Real values live only in `.env`.

---

## 3. Engine behaviours the UI must respect

- `engine.startSearch(prefs)` returns a handle; subscribe for **progressive** state: results arrive over time (stages: `resolving-city → discovering-localities → routing → profiling-amenities → scoring → done`, or `error`). A search takes tens of seconds live. Design for waiting.
- `SearchState.areas` grows and can **re-rank** as results come in. Animate re-ordering gently (or avoid it) and never let the layout jump under the user's cursor.
- `SearchState.localityErrors` and `errors` can be non-empty while results still exist (`partial`). Show a calm, specific note, not an alarm.
- `selectAreas(areas, { sort, filters, limit, offset })` is exported from `@engine`. **Use it for all sort/filter/paging.** Do not reimplement that logic in the UI.
- `dataCompleteness` is **0–1** in `types.ts` (the contract prose says "percentage"; trust the type): display ×100 as a whole-number percent.
- `engine.method()` drives the `/method` page and the radii/weights shown anywhere else. Never hardcode a radius or weight in the UI.
- Engine mode comes from `VITE_ENGINE_MODE` (`mock | snapshot | live`). Required UI treatment:
  - `snapshot`: a persistent, quiet banner: "Recorded demo data · captured {date}", where the date comes from `fetchedAt` values in the data. Never present snapshot data as live.
  - `mock`: a banner "Sample data".
  - `live`: no banner.
- Commute modes: `engine.method().routingProfiles` says which modes are `available` and which are `isHeuristic`. Only offer modes that are available, and mark heuristic ones as estimates.

---

## 4. Design system

All visual values live as CSS custom properties in a single `src/ui/styles/tokens.css`. No hex literals or magic numbers elsewhere. Design tokens are the human's main tuning surface.

### 4.1 Colour
Palette (from the human): cream `#FFF3EB`, peach `#F9CEC4`, coral `#F7A8A1`, taupe `#D6C2BE`, charcoal `#2C2A2E`.

| Token | Value | Role |
| :-- | :-- | :-- |
| `--bg` | `#FFF3EB` | Page background |
| `--ink` | `#2C2A2E` | Text, primary buttons |
| `--ink-muted` | DERIVED, warm grey (start near `#6B6469`) | Secondary text |
| `--line` | `#D6C2BE` | Hairline borders, dividers, disabled |
| `--soft` | `#F9CEC4` | Selected/hover surfaces, quiet fills |
| `--accent` | `#F7A8A1` | **One accent moment per screen** |
| `--surface` | DERIVED, a lighter tint of cream (start near `#FFF9F4`) | Elevated panels, dropdowns |
| `--danger` | DERIVED, muted terracotta (start near `#A84A36`) | Errors, only for text and thin lines |
| `--ok` | DERIVED, muted sage (start near `#4F6B53`) | "High confidence" text/dot |

Rules:
- Text on `--bg` must be `--ink` or `--ink-muted`. **Never** use `--line`, `--soft`, or `--accent` for text. Dark text only on coral and peach fills; never white on them.
- Derived tokens must be **contrast-checked by script** (target ≥ 4.5:1 for body text, ≥ 3:1 for UI components) and adjusted until they pass; record the measured ratios in `docs/UI_DESIGN.md`.
- **Colour never carries meaning alone** (see confidence in §5).
- **Dark mode** is a token swap (charcoal background, cream ink, coral accent). Implement it in Phase U5 if time allows. Structure the tokens now so it needs no component changes.

### 4.2 Typography
- Display/headings: a refined serif (`Fraunces` or `Instrument Serif`; verify availability with `npm view @fontsource/<name>`). UI/body: a clean sans (`Inter` or `DM Sans`). Self-hosted, `font-display: swap`, real fallback stacks, and subset to Latin to keep payload small.
- Numbers: `font-variant-numeric: tabular-nums` wherever figures align (tables, scores, rents).
- Scale: fluid with `clamp()`. At most **two weights** per view. Slight negative tracking on large display text; generous line-height (1.5–1.65) on body.
- **Formatting:** Indian digit grouping via `Intl.NumberFormat("en-IN")` (₹1,20,000), commute as "28 min", distance as "9.4 km", scores as whole numbers, `dataCompleteness` as a whole-number percent.

### 4.3 Space, shape, depth
- 4px base spacing scale; generous whitespace (when in doubt, add space, not borders). Content max width ~1120 px; reading text ~65ch.
- Radii: small (6–8 px) for controls and cards; full pill only for chips. 1px hairlines (`--line`) instead of shadows. A single, very soft shadow token is allowed **only** for floating layers (dropdowns, the sticky compare bar). No gradients. No glassmorphism. No nested cards.
- Icons: a handful of inline SVGs written by hand (arrow, check, bookmark, plus, minus, close, chevron). No icon libraries, no emoji.

### 4.4 Motion (the signature of "premium")
Tokens: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--dur-fast: 140ms`, `--dur-base: 220ms`, `--dur-slow: 400ms`.

Rules:
- Animate **`transform` and `opacity`** (plus colour/background/border-colour on hover). Never animate width, height, top, left, margin, or box-shadow spread. Use `will-change` sparingly.
- Everything responds within one frame; transitions are short (140–220 ms) and soft-landing (ease-out). Nothing bounces, wobbles, or loops.
- **Buttons** (the human cares most about these):
  - *Primary:* charcoal fill, cream text. On hover a coral fill **sweeps in** from the bottom or left (pseudo-element, `transform: scaleX/translateY`) while text colour stays legible (charcoal on coral). The trailing arrow slides ~3 px. On press: `scale(0.985)` for the duration of the press. On loading: label crossfades to a slim inline progress line (no spinners).
  - *Secondary:* transparent with a 1px `--line` border; hover fills `--soft`; border darkens.
  - *Text/ghost links:* underline grows from left (`background-size` or `transform`), no colour flash.
  - *Icon toggles* (save bookmark): the fill fades in; a 1-frame scale pulse (1 → 1.08 → 1) at most.
  - Focus-visible: 2px ring in `--ink` with 2px offset; always visible and never removed.
- **Cards:** on hover, 1px lift (`translateY(-1px)`) and border darkens. No big zoom, no shadow bloom.
- **Streaming results:** each new card fades up (opacity 0→1, `translateY(8px)→0`, `--dur-slow`), staggered ~40 ms and **capped at 8 staggered items**; later items appear without stagger. Reserve space with **skeleton cards of the same dimensions** so nothing jumps (CLS ≈ 0). Re-ranking uses a gentle FLIP-style transform animation or no animation. Never reflow abruptly.
- **Pipeline progress:** a 2px line at the top of the results area, animated with `transform: scaleX`; stage labels crossfade. When the search is `done`, the panel collapses to a compact one-line status (still reachable and still carrying `data-feature` ids).
- **Page transitions:** a 200 ms crossfade between routes (CSS only; use the View Transitions API only as progressive enhancement, behind a feature check).
- `@media (prefers-reduced-motion: reduce)`: remove all transforms and sweeps; keep only instant colour changes or ≤120 ms opacity fades. This must be tested.
- No parallax, no scroll-jacking, no cursor-follow effects, no auto-playing anything, no confetti.

### 4.5 Anti-clutter rules (testable; the human will review against them)
1. **One primary action per screen**, and at most **one accent (`--accent`) moment per screen** (for example the match-score marker or the active step).
2. **Cards show:** rank, name, match score, ≤3 key facts, a save toggle, a details link. Everything else is behind the Details click or a disclosure.
3. **Filters and sort are collapsed** behind a single quiet "Refine" disclosure by default; the sort control is a minimal select.
4. Hairlines over boxes; no nested cards; no decorative dividers; no more than two type sizes inside any card.
5. Provenance is **always present but quiet**: small text-weight badges in `--ink-muted`; full detail (note, `fetchedAt`) appears in an accessible tooltip/popover on hover **and** keyboard focus.
6. Sentence case everywhere. Short labels. No exclamation marks, no marketing superlatives, no "AI-powered".
7. Empty and error states: one sentence + one action. Never a wall of text.
8. If a screen feels busy, remove something before adding anything.

---

## 5. Honesty requirements (these are product features, not decoration)

**Confidence is shown without colour.** `ConfidenceMark` component: `high` ● (filled), `medium` ◐ (half), `low` ○ (outline), `none` ⊘, always with the word beside or after it, in `--ink-muted`.

**`ProvenanceBadge`** renders `{source} · {confidence}` for **every** `Measured<T>`. A null value renders "Not available" and its `note`. The tooltip adds `fetchedAt` when present.

**Mandated labels** (use these words; do not soften them):

| Where | Required wording |
| :-- | :-- |
| Match score | "Match" plus "Based on {n}% of available data" (from `dataCompleteness`) |
| Commute | "Peak estimate" next to "Free-flow" (range); `source: heuristic` visible |
| Rent | "Estimated band" (a range, never a single number), "Not listing data"; the user-override state reads "Your figure" |
| Safety | "Infrastructure indicator, not crime data" (always visible next to any safety figure) |
| Amenities | Real counts with the queried radius from `engine.method()`, e.g. "Healthcare within 1.5 km" |
| Snapshot/mock banner | As in §3 |

Never present a heuristic as measured. Never hide a `low` or `none` confidence value; de-emphasise it with `--ink-muted`, never remove it.

---

## 6. Screen specifications

General: mobile-first. It must work from 360 px wide to desktop. Touch targets ≥ 44 px. Keyboard-complete. One `h1` per page. Landmarks (`header`, `main`, `nav`). A consistent, quiet header: wordmark "Locus" at left, small nav (Saved, How it works) at right, collapsing gracefully on mobile.

**`/` Home.** A spacious hero: serif headline **"Find where to live."**, one supporting line **"Neighbourhoods ranked by commute, amenities and budget, with the source of every number."**, a single primary "Start" button, and a quiet text link "Resume last search" only if one exists. Entrance: lines fade up in sequence (≤ 600 ms total). At most one decorative element, a very faint line-art motif (≤ 6% opacity), optional. Footer: link to "How it works". No feature grids, no logos, no stats.

**`/plan` Stepper.** One focused question group per step; large inputs; a three-segment thin progress indicator; Enter advances; autofocus on the first field; smooth horizontal fade/slide between steps (transform + opacity). Step 1: city and workplace use an accessible combobox (ARIA combobox pattern, keyboard arrows/Enter/Escape) fed by `engine.suggestPlaces`, debounced and abortable; a selection becomes a removable chip. Step 2: transport selector shows only available modes (mark estimated ones), max-commute slider with a live numeric readout, and a "+ Add a destination" ghost button (≤ 3). Step 3: budget inputs (₹, en-IN formatting while typing), household selector as a segmented control, optional priority as a quiet select. Inline validation appears beneath the field in `--danger` with text (never colour alone), and no layout jump (reserve the line).

**`/results`.** Top: a compact preferences summary with "Edit" and "Copy link" (toast feedback via a calm, auto-dismissing status region). Beneath it: the pipeline progress line and stage label (§4.4); after completion, a one-line status. List/Map toggle as a segmented control. "Refine" disclosure holds sort and filters. Area cards in a single-column list on mobile and a two-column grid on wide screens, or a list with generous row height (choose with a `DECISIONS.md` entry). Sticky compare bar appears (slides up with opacity) only when ≥ 1 selected. "Load more" is a secondary button. States: `loading` (skeletons), `partial` (a calm note with the failed count and a "details" disclosure of `localityErrors`), `empty`, `error` (one sentence + "Try again" which restarts the search), `sparse-data`.

**`/area/:id`.** A calm article layout: serif name, the match score with its completeness line and explanation; then sections separated by whitespace and hairlines: *Score breakdown* (table of criterion, points/max, source and confidence badge, note on disclosure), *Commute* (per destination: free-flow range → peak estimate, mode, `exceedsMax` as a text label), *Around here* (amenity grid with real counts and radii), *Rent* (estimated band, "Enter a known rent" field → `setRentOverride`, with an unobtrusive "Your figure" state and a way to clear it), *Safety* (indicator with its permanent disclaimer and `coverageNote`), *Find listings* (portal links; the generic search link is always present; open in a new tab with `rel="noopener noreferrer"`). The save toggle sits near the title. Tables become stacked rows on narrow screens.

**`/compare`.** A hairline table with sticky first column on mobile (horizontal scroll inside its own container, never the page). The winner of each row is indicated by a subtle `--soft` background **plus** a text/ARIA marker ("Best"), never by colour alone. Ties show no winner. Each area column has a remove control. Handle 2 or 3 areas; fewer shows a gentle prompt.

**`/saved`.** A quiet list reusing the card. Empty state with one action. "Compare selected" appears when ≥ 2 are checked.

**`/method`.** Long-form and typographically rich: a readable article with tables for weights, radii, routing availability, a confidence legend (the same `ConfidenceMark`), and limitations, all from `engine.method()`. This page is a selling point for honesty, so make it beautiful.

---

## 7. Accessibility and quality bars
- WCAG 2.2 AA intent: contrast per §4.1, visible focus, proper labels, `aria-live="polite"` for pipeline progress and toasts, correct combobox/dialog/disclosure semantics, no keyboard traps, `lang` set, reduced-motion respected, zoom to 200% without loss.
- Performance: no layout shift when results stream (skeletons match final size); route-level code splitting; lazy-load the map; fonts preloaded and subset.
- Browsers: current Chrome, Safari (iOS), Firefox, and Edge. Use CSS features with fallbacks where support is not universal and note them in `docs/UI_DESIGN.md`.
- Tests: the feature-ID guard (§2.2); unit tests for formatting helpers, `ProvenanceBadge`, `ConfidenceMark`, and null-handling; a reduced-motion test (the sweep/transform styles are absent under the media query). Add `eslint-plugin-jsx-a11y` if it passes `npm view` and installs cleanly.

---

## 8. Living documentation (UI track)
Create and keep current (update in the same commit as the change that makes them stale):

| File | Purpose |
| :-- | :-- |
| `docs/UI_DESIGN.md` | Tokens, type scale, motion rules, component inventory (props, states), measured contrast ratios, browser notes |
| `docs/UI_PROGRESS.md` | Phase table, per-phase log, **"Resume here"** block so a fresh agent can continue, known gaps |
| `docs/UI_ENGINE_REQUESTS.md` | Proposed engine changes (never implemented by you) |
| `docs/DECISIONS.md` | Append UI decisions (dependencies, layout choices), tagged `ASSUMPTION` where unevidenced |
| `README.md` | Add a short "UI" section: how to run in each mode, dev tools, how to build |

Optional: `docs/screens/*.png` (screenshots of key states) if you can render a browser.

---

## 9. Phases

| # | Title | Budget |
| :-- | :-- | :-- |
| U0 | Foundation: tokens, fonts, primitives, guards | 1.5 h |
| U1 | Shell, Home, Plan stepper (**checkpoint**) | 2 h |
| U2 | Results (streaming, cards, refine, compare bar) | 3 h |
| U3 | Area detail and Method | 2 h |
| U4 | Compare and Saved | 1.5 h |
| U5 | Polish: responsive, a11y, reduced motion, banners, dev-tool gating; dark mode and map if time allows | 2.5 h |
| U6 | Final audit, docs, PR-ready | 1 h |

**Scope priority if time runs short (cut from the bottom):** (1) demo path: Home → Plan → Results → Area detail, with banners and honesty labels; (2) Method; (3) Compare and Saved; (4) responsive and a11y polish; (5) dark mode; (6) map. **Never cut:** provenance and confidence display, the mandated labels, the feature-ID guard, the living docs.

**U0.** Confirm branch, read the contract and types, run `npm run check` and the app in `mock` and `snapshot` modes to see the baseline. Build `tokens.css`, a minimal reset, self-hosted fonts, base layout, and the primitives: `Button` (variants + loading), `IconButton`, `Field`, `Select`, `Slider`, `Chip`, `ConfidenceMark`, `ProvenanceBadge`, `Card`, `Skeleton`, `Disclosure`, `Tooltip` (accessible, no library), `Toast`, `EmptyState`, `ErrorState`, `ModeBanner`. Write `check:features`. Start `UI_DESIGN.md` with measured contrast ratios. **Acceptance:** `npm run check` passes (including the new guard); a dev-only primitives page (gated like `/_map`) shows every primitive in every state; the old wireframe still functions.

**U1.** App shell (header, route crossfade, footer), Home, and the full Plan stepper with accessible comboboxes, chips, validation, and step transitions. **Acceptance:** `check` passes; completing the stepper navigates to `/results` with the same query string the wireframe produced; keyboard-only completion works; reduced-motion verified. **Checkpoint: stop and wait for the human.** In the report, describe the look and feel decisions and list anything you want the human to confirm (fonts, motion intensity, card layout).

**U2.** Results as specified, including skeletons, streaming animation, `selectAreas` for all sorting/filtering/paging, the compare bar, the persistent `partial`/`error`/`empty` states, and the mode banners. **Acceptance:** all six scenarios render correct `data-state` values; in `slow` and `partial` scenarios the layout does not shift when cards arrive; `check` passes; the human can still reach every previous feature id.

**U3.** Area detail and Method as specified. **Acceptance:** every `Measured` value on the detail page shows its badge or "Not available" plus note; the safety and rent labels match §5; rent override round-trips through `engine.setRentOverride`.

**U4.** Compare and Saved. **Acceptance:** winners are marked with text/ARIA and a quiet fill; ties show none; the `/saved` state survives reload.

**U5.** Responsive pass at 360, 768 and 1280 px; keyboard and screen-reader pass using the semantics in §7; reduced-motion test; production gating of dev tools; banner checks across `mock`, `snapshot` and `live`; bundle-size report vs the budget; **then, if time remains, dark mode (token swap) and the lazy-loaded Leaflet map** (markers from real `lat/lon`, a muted look via CSS filter on tiles, mandatory OpenStreetMap attribution, tile-provider terms verified and recorded, graceful fallback when tiles fail, no API keys). **Acceptance:** documented results for each check; `check` passes.

**U6.** Audit docs against the code, confirm no engine files changed (`git diff main --stat -- src/engine fixtures` must be empty), confirm no hex literals outside `tokens.css`, run one live smoke in a browser if network allows, write the final report. **Acceptance:** PR-ready; `UI_PROGRESS.md` accurate.

---

## 10. Phase protocol
**Start of each phase:** re-read `docs/UI_PROGRESS.md` ("Resume here"), `docs/UI_DESIGN.md`, `docs/UI_CONTRACT.md`; write a 5–10 line plan.
**During:** small commits; verify before assuming; look at your work at 360 px and desktop.
**End:** run `npm run check`; update the docs touched; commit `ui(phase-UN): title`; tag `ui-UN`; push `ui`; post a report (*Done · Verified (commands + real output) · Decisions · Deviations · Known gaps · Engine requests · Next · Questions with defaults*), under ~25 lines.
**Checkpoint:** stop and wait for the human only after U1. After that, continue unless blocked or an engine change is truly needed.

---

## 11. Begin
Acknowledge in one short message that you have read this prompt, the contract, and the types. Then start **Phase U0**.
