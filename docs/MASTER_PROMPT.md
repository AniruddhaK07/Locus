# MASTER BUILD PROMPT — Locus

> Paste this whole file to the coding agent as the first message. Everything the agent needs is in here.

---

## 0. Your role and how to read this prompt

You are a senior full-stack engineer agent. You will build **Locus** from an **empty repository**, in numbered phases, keeping living documentation current and committing to git after every phase and every feature.

Read this entire prompt before doing anything. Then begin with **Phase 0** (§9).

Order of authority when instructions conflict:
1. Hard rules (§2)
2. Architecture requirements (§3) and algorithm specs (§4)
3. Phase definitions (§9)
4. Your own judgment

If this prompt is silent, choose the simplest option and record it in `docs/DECISIONS.md`. If something here is wrong, impossible, or contradicts reality you observe, **say so explicitly** in `PROGRESS.md` and in your phase report. Never deviate silently.

---

## 1. Product

**Locus** helps a person relocating within India decide *where to live*. They enter a city, a workplace, up to 3 other regular destinations, a budget range, a maximum commute, a transport mode, and a household type. Locus discovers real neighbourhoods in that city, measures what is around each one, estimates commute times, and produces a ranked list with a **transparent** score, a plain-English explanation, and links into listing portals.

Principles (these decide close calls):
- **Honesty over false precision.** Every number shown to a user says where it came from and how much to trust it.
- **$0 infrastructure, no API keys.** Free public services only (OpenStreetMap ecosystem). Hosting on a free tier.
- **Any Indian city.** No hardcoded city or neighbourhood datasets. Localities come from live data.
- **Premium minimalism** applies to copy and structure: short labels, no filler text, no marketing fluff.

The product's name is **Locus**. Use it everywhere (package name, docs, UI copy).

---

## 2. Hard rules

### 2.1 Originality (hackathon compliance)
- This project must be built **from scratch inside the hackathon time window**. Do not read, import, copy, paste, or adapt code from any earlier project. Treat the "known pitfalls" in §4 as *requirements*, not as code to port.
- Do not carry earlier-project names or code into identifiers or source files. Whether and how to disclose the project's background is the human's decision; the README may contain a human-written "Background" note, and you must not remove or obscure it.
- Create the repo fresh. In `PROGRESS.md`, record the start timestamp (ISO 8601, with timezone) at the beginning of Phase 0.

### 2.2 Anti-hallucination rules
1. **No invented data.** If a value cannot be obtained from a real source, it is `null` with `source: "unavailable"` and a reason. Never substitute a "reasonable default" and display it as fact.
2. **No invented facts about external services.** Before coding against any external API (endpoints, parameters, response shape, CORS behaviour, rate limits, supported routing profiles), **probe it with a real request** (`curl` or a script in `scripts/probe/`) and record the result in `docs/VERIFIED_FACTS.md` (date, request, observed result). If you cannot probe (no network), mark the item `UNVERIFIED` and design so it can be swapped.
3. **No invented library facts.** Check package names and versions with `npm view <pkg> version` before adding them. Do not assume an API from memory; read the installed package's types or docs.
4. **No unmeasured claims.** Never write accuracy numbers, speed-ups, "within ±X%", or "100% accurate" in code, docs, or UI unless you measured it in this repo and can point to the measurement. Heuristics are called heuristics.
5. **No fake "done".** A phase is done only when its acceptance criteria (§9) pass. Say which commands you ran and what they printed. If a criterion fails, say so, fix it or document it as a known gap; do not mark the phase complete.
6. **No silent fallbacks to fake data.** Fixtures/mocks load **only** in `mock` mode. In `live` mode, a failure surfaces as an error or a `null` + reason, never as sample data.
7. **Label assumptions.** Anything you decide without evidence goes in `docs/DECISIONS.md` tagged `ASSUMPTION`.
8. **Ask once, early, in a batch.** If you need a human decision, collect all questions into one message at the end of Phase 0 (and one at the Phase 1 checkpoint). For every question, state the default you will use if unanswered, and keep working with the default.
9. **Do not invent URLs.** Portal deep links must follow patterns you verified (§4.7) or fall back to a search URL.

### 2.3 Engineering rules
- **TypeScript, `strict: true`.** Node LTS. No `any` without a comment justifying it.
- One command gates everything: `npm run check` = typecheck + lint + unit tests. **It must pass before every commit.**
- Keep dependencies minimal. Every dependency is recorded in `docs/DECISIONS.md` with a one-line reason.
- No secrets in the repo. Config via `.env` (git-ignored) with `.env.example` committed.
- Every external call goes through the infrastructure layer (§3.2) with: timeout, `AbortSignal` support, caching, and rate limiting. No bare `fetch` in feature code.
- Never run destructive commands outside the repository directory.

### 2.4 Git rules
- `git init` in Phase 0. Add a sensible `.gitignore` first.
- **Commit after every phase and after every discrete feature inside a phase** (small, reviewable commits). Never commit a state where `npm run check` fails.
- Message format (Conventional Commits): `feat(scope): …`, `fix(scope): …`, `docs: …`, `test: …`, `chore: …`. Phase completion commit: `phase(N): <title>`; then tag it `phase-N`.
- The commit that completes a phase includes the updated docs (§2.5) in the same commit.
- **Do not push** to any remote unless the human asks. Never force-push, never rewrite history.

### 2.5 Living documentation (always current, never stale)
These files are part of the product. Update them **in the same commit** as the code change that makes them stale.

| File | Purpose | Update when |
| :-- | :-- | :-- |
| `README.md` | What Locus is, how to run (`mock` and `live`), scripts, env vars | Setup or commands change |
| `ARCHITECTURE.md` | Current truth of structure, data flow, modules, public engine API, algorithms with the *actual* constants | Any structural or algorithmic change |
| `PROGRESS.md` | Phase table, per-phase log, **"Resume here" block**, known gaps | End of every phase and feature |
| `docs/DECISIONS.md` | Lightweight decision log: decision, alternatives, reason, `ASSUMPTION` tags | Every non-obvious choice |
| `docs/VERIFIED_FACTS.md` | Probed facts about external services (see §2.2.2) | Every probe |
| `docs/DATA_PROVENANCE.md` | Every number the UI can show: source, method, limits, confidence rules | Any metric added or changed |
| `docs/UI_CONTRACT.md` | Everything the UI builder needs (see §5.4) | Any engine API or screen change |

`PROGRESS.md` must always let a **fresh agent with zero memory resume the work**. Its top section, "Resume here", states: current phase, what is done, what is in progress, the exact next step, how to run checks, and any blockers or open questions. Keep it truthful and short.

---

## 3. Architecture requirements

### 3.1 The two halves (critical)
A human is building the UI **separately** and must never have to touch the backend logic. Therefore:

- **`src/engine/`** — framework-agnostic TypeScript. No React, no direct DOM access. Browser capabilities (storage, fetch) are injected via adapters. This holds all logic: providers, scoring, pipeline, caching, state.
- **`src/ui/`** — React. A thin, **replaceable** presentation layer that talks to the engine only through its public API.
- **Enforce the boundary with ESLint** (`no-restricted-imports`): files in `src/ui/**` may import only from `src/engine/index.ts` (and external UI libs). Files in `src/engine/**` may not import from `src/ui/**` or `react`.
- **The public engine API is a stable contract.** After the Phase 1 checkpoint, changes to it must be **additive**. Any breaking change must be flagged `CONTRACT CHANGE` in the commit message, `PROGRESS.md`, and the phase report, and reflected in `docs/UI_CONTRACT.md`.

### 3.2 Repo layout (guideline; adapt with a `DECISIONS.md` entry)
```
/
├─ README.md  ARCHITECTURE.md  PROGRESS.md
├─ docs/  (DECISIONS, VERIFIED_FACTS, DATA_PROVENANCE, UI_CONTRACT)
├─ scripts/probe/            live probes for external services (not run in CI)
├─ fixtures/recorded/        real responses captured by probes (with fetchedAt), used by parser tests
├─ api/                      ONLY if Phase 0 probes prove a server relay is required
├─ src/
│  ├─ engine/
│  │  ├─ index.ts            the ONLY public entry for the UI
│  │  ├─ domain/             types, ids, provenance
│  │  ├─ config/             weights, radii, tier tables, constants (all tunables live here)
│  │  ├─ infra/              http client, cache, rate-limit queue, mirror failover
│  │  ├─ providers/          geocode, localities, amenities, routing, rent, safety
│  │  ├─ scoring/            pure functions
│  │  ├─ pipeline/           orchestrator (progressive, abortable)
│  │  ├─ portals/            listing deep links
│  │  ├─ state/              saved set, search cache, URL (de)serialisation
│  │  └─ mock/               scenario-driven mock engine (mode: "mock")
│  └─ ui/                    React app: pages/, components/, styles (skeleton only for now)
└─ tests/ (or colocated *.test.ts)
```

### 3.3 Stack (defaults)
React 19, Vite, React Router, TypeScript, Vitest, ESLint. Leaflet for maps (UI side, later; the skeleton uses a placeholder box). Hosting target: Vercel Hobby or Cloudflare Pages (static, plus `api/` only if needed). Verify current major versions with `npm view` before pinning.

### 3.4 Provenance on every metric (core pattern)
```ts
type Source = "osm" | "routing" | "heuristic" | "user" | "fixture" | "unavailable";
type Confidence = "high" | "medium" | "low" | "none";

interface Measured<T> {
  value: T | null;          // null = not available (never a guessed default)
  source: Source;
  confidence: Confidence;
  note?: string;            // reason when null; method caveat otherwise
  fetchedAt?: string;       // ISO time for live data
}
```
Every score input and every displayed metric is a `Measured<T>`. Scoring and UI both read `source` and `confidence`.

### 3.5 Public engine API (sketch — finalise in Phase 1, then freeze)
```ts
createEngine(opts: { mode: "live" | "mock"; scenario?: MockScenario }): Engine

interface Engine {
  suggestPlaces(query: string, hint?: { city?: string }, signal?: AbortSignal): Promise<PlaceSuggestion[]>;
  startSearch(prefs: Preferences): SearchHandle;     // abortable, progressive
  getArea(id: AreaId): Promise<AreaDetail | null>;   // re-hydrates from cache or re-fetches by stable id
  compare(ids: AreaId[]): ComparisonResult;
  saved: { list(): AreaId[]; toggle(id: AreaId): void; subscribe(cb: () => void): () => void };
  portals(area: AreaSummary): PortalLink[];
  method(): MethodInfo;                              // weights, sources, radii — powers the "How it works" page
  prefsToQuery(p: Preferences): string;  queryToPrefs(q: string): Preferences | null;  // shareable URLs
}

interface SearchHandle {
  id: string;
  getState(): SearchState;                           // stage, progress, areas[] (partial), errors[]
  subscribe(cb: (s: SearchState) => void): () => void;
  cancel(): void;
}
```
Rules: locality IDs are **stable** (`"{osmType}/{osmId}"`, e.g. `way/123456`) so deep links survive reloads. Per-locality failures are recorded in state; they never throw out of the pipeline.

### 3.6 External services policy
Candidate services (all unauthenticated): Photon (typeahead geocoding), Nominatim (forward geocoding, city resolution), Overpass (localities, amenities), OSRM (routing). **Verify every one in Phase 0** (§2.2.2): reachability, CORS from a browser origin, response shape, rate behaviour, which routing profiles actually exist on which host, and whether a `table` (many-to-one) endpoint is available.

Known policy constraints to respect:
- Nominatim's public usage policy **forbids autocomplete/search-as-you-type**, enforces roughly 1 request/second, and requires identification. Use Nominatim only for **on-submit** resolution; use a typeahead-appropriate service (e.g. Photon) for suggestions if probes confirm it works. Identification via env var `GEO_CONTACT` (e.g. email) where a server relay is used.
- The public OSRM demo host may support only a car profile. **Do not assume** bike/foot work: probe. Look for hosts with separate bike/foot profiles; if none is verified, disable those modes or mark them `heuristic`.
- Overpass limits per IP and has few slots. If calls go through a serverless relay, **all users share the relay's IP** and starve each other; calling directly from each user's browser spreads load. Decide direct-vs-relay from the CORS probe results and record it in `DECISIONS.md`. A serverless function's in-memory queue does **not** persist across invocations, so never rely on it as a global limiter.
- Verify each Overpass mirror is alive at build time; drop dead ones.

---

## 4. Algorithm specs and known pitfalls

All tunable constants live in `src/engine/config/` with a comment stating whether each is `VERIFIED`, `SOURCED(<where>)`, or `HEURISTIC`. Mirror them in `ARCHITECTURE.md`.

### 4.1 Locality discovery
- **Resolve the city first** with the geocoder to an OSM administrative **relation**, then query Overpass by **area id** (`3600000000 + relationId`) rather than a name regex (avoids duplicate-name collisions such as same-named cities/districts). If the city resolves only to a node or has no relation, fall back to the geocoder's bounding box with **no arbitrary padding**; record this in the result's `note`.
- Query `node`, `way`, **and** `relation` for `place` ∈ {suburb, neighbourhood, quarter} (verify which values yield results in Indian cities during Phase 0 probing; record it). Use `out center` and read `lat ?? center.lat`. Many neighbourhoods are polygons, not points.
- Stable id `"{type}/{id}"` (node, way, relation ids overlap, so the type is part of the id). Drop unnamed elements. De-duplicate by normalised name + proximity.
- **Select, don't truncate.** Overpass returns an arbitrary subset under a limit. Fetch broadly, then rank candidates by great-circle distance to the primary anchor (workplace), pre-filter those that cannot meet the max commute even in the fastest mode, and keep the top **N = 12** (config). Expose "load more" in the contract.
- No curated or hardcoded locality list. No hardcoded coordinates.

### 4.2 Amenity profile (zero fabrication)
- One Overpass request per locality that returns **separate real counts per category**: healthcare, education, grocery, food & dining, leisure/parks, bus stops, rail/metro stations. Prototype the query in a probe script and choose a verified form (named sets with `out count;` per set, or `make stat` with correct evaluator syntax; do not assume the syntax, test it). Record the working query in `VERIFIED_FACTS.md`.
- Use `nwr` (nodes, ways, relations) with `out center`/counts. Schools, hospitals, and parks are frequently mapped as polygons, so **node-only queries undercount**.
- Radii come from one config table (e.g. daily-needs categories ~800 m, institutions/parks/stations ~1500 m; verify these as design choices, not facts). **The radius shown in the UI must equal the radius queried.**
- Never split a combined count by fixed ratios. Never convert a failed/empty query into `0`: a failed request is `null` + reason; a real zero is `0` with `source: "osm"`.
- **Normalisation:** convert counts to 0–10 category scores **relative to the other candidates in the same search** (`log1p` then min–max, or percentile rank). Fall back to documented absolute reference constants (`HEURISTIC`) only if fewer than 5 candidates exist. Do not present absolute ceilings as "empirical".
- **Coverage warning:** OSM tagging density varies by city. Compute a simple coverage indicator (e.g. total mapped objects in the radius) and lower `confidence` when it is very sparse.

### 4.3 Commute
- Providers behind a `RoutingProvider` interface. Prefer a **many-to-one `table`** request over N single routes if verified. Respect the rate limit through the infra queue.
- Free-flow routing durations understate Indian peak-hour travel. Apply a **peak adjustment**, but treat it honestly:
  - `T_peak = T_freeflow × (1 + α_city × (1 − exp(−d/8)))` with `d` = route distance in km. This form is a **HEURISTIC**.
  - Report **both** values: `freeFlowMin` and `peakEstimateMin` (a range), with `source: "heuristic"` on the peak value and `confidence: "low"`.
  - `α` per city tier lives in config, tagged `HEURISTIC`, with starter values: mega-metro 2.3, dense metro 1.9, other large metro 1.6, everything else 1.2. Resolve the tier from the **geocoder's normalised city/district fields**, not from raw user text, and fall back to the "everything else" tier. Provide `docs/CALIBRATION.md` with a table where the human can add real observed commute times to sanity-check α. **Do not claim accuracy.**
- Modes: `car`, `bike`, `walk` only where a verified profile exists; otherwise mark `heuristic` or disable. **`transit`**: do **not** derive from driving time. Stretch goal only (Phase 9): estimate when a rail/metro station exists within a walkable radius at both ends, via straight-line distance × detour factor ÷ speed + headway, labelled `heuristic`, `confidence: "low"`; otherwise return `null` with the reason "no transit access nearby".
- Multiple destinations: compute each separately and show each. Effective commute for scoring = `0.7 × primary + 0.3 × mean(extras)` when extras exist (`ASSUMPTION`, in config).

### 4.4 Scoring (pure functions, fully unit-tested)
- Criteria and **prior** weights (config, `HEURISTIC`): budget 28, commute 27, safety 18, amenities 12, transit access 8, household fit 7.
- **Missing or weak data reduces influence instead of being defaulted.**
  `effectiveWeight = baseWeight × confidenceFactor` with factors `high 1.0, medium 0.7, low 0.35, none 0` (config). Then **renormalise** over criteria that have a non-null value so the final score spans 0–100. Never use `value || default`; use `??` and explicit null handling (a real `0` is not "missing").
- Output per area: `matchScore` (0–100, no artificial cap at 99), per-criterion `{points, max, effectiveWeight, raw: Measured<…>}`, and `dataCompleteness` (share of base weight actually backed by data).
- **Budget utility** (use exactly this; continuous and monotone). Let `Rmin`, `Rmax` from the user (`Rmin` defaults to `0.4 × Rmax` if not given) and `Rt = Rmin + 0.75 × (Rmax − Rmin)`:
  - `Rmin ≤ R ≤ Rt` → `U = 1`
  - `Rt < R ≤ Rmax` → `U = 1 − 0.3 × (R − Rt) / (Rmax − Rt)` (falls linearly from 1 to 0.7)
  - `R > Rmax` → `U = 0.7 × exp(−4 × (R − Rmax) / Rmax)`
  - `R < Rmin` → `U = 1 − 0.3 × (Rmin − R) / Rmin`, floored at 0.7
  Required property tests: continuity at `Rmin`, `Rt`, `Rmax`; non-increasing for `R > Rt`; `U ∈ [0,1]`; a rent just under `Rmax` always scores higher than the same rent just over it.
- **Rent is not freely available.** Do not scrape listing sites. Implement a `RentProvider` interface with: (a) `UserOverride` (user enters a known rent for an area, `source: "user"`, `high`); (b) `CityTierBand` estimate: a **range** `{low, high}` from the starter table below scaled by a locality-relative index (rank of amenity density and distance from the city's centre), returned with `source: "heuristic"`, `confidence: "low"`, and a note "estimated band, not listing data". Never show a point value as if it were a market rent. The starter table is **UNVERIFIED** and must be tagged so in config and in `DATA_PROVENANCE.md`:

  | Tier | Examples | Band low (₹/mo) | Band high (₹/mo) |
  | :-- | :-- | :-- | :-- |
  | 1 Prime | Mumbai, Delhi, Bengaluru | 22,000 | 120,000 |
  | 1 Standard | Pune, Hyderabad, Chennai | 16,000 | 65,000 |
  | 2 | Jaipur, Lucknow, Nagpur, Indore | 9,000 | 32,000 |
  | 3 | rest of India | 5,000 | 18,000 |

- **Safety** has no free authoritative source. Compute only an **infrastructure indicator** from OSM (police stations in range, lit roads / street lamps, surveillance nodes) and label it exactly "infrastructure indicator, not crime data". Because OSM tagging of these is sparse in many places, set `confidence` from a coverage check and use `null` when coverage is too thin. Do not use a baseline constant such as "5.0 + …". Never derive safety from amenity counts.
- **Household fit** is derived from category counts by documented formulas in config (family → schools, parks, healthcare; couple → food, leisure; student → education, transit, food), `HEURISTIC`. No hand-entered per-neighbourhood ratings.
- **Commute score:** `exp(−k × t / tMax)` with `k = 1.0` (config, `HEURISTIC`), computed on the effective peak-estimate commute; also set a `exceedsMax` flag when `t > tMax`.
- **Amenities score** = weighted blend of the relative category scores; **transit access** from stop/station relative scores.

### 4.5 Explanations
Template-based plain English built from the real component values and their provenance (no LLM calls). Example shape: "28 min by car at peak (estimate) · strong grocery and healthcare access · rent band is an estimate". Must mention low-confidence or missing inputs.

### 4.6 Pipeline (progressive, abortable, resilient)
Stages: `resolving-city → discovering-localities → routing → profiling-amenities → scoring → done`. Emit state after each unit of work so the UI fills in progressively. A new search aborts the previous one. Concurrency to Overpass = 1 with ≥ ~700 ms spacing (verify against probes), exponential backoff with jitter on 429/5xx, mirror rotation on failure. Cache by request key in IndexedDB (via an adapter) with a TTL (config), so repeat searches and reloads are instant. Per-locality failure → that locality shows `null` metrics + reason; the rest continue.

### 4.7 Portal links
Build links only from patterns **verified by probe or documented behaviour**. Show a portal link only when verified applicable for that city (e.g. a service that operates in limited cities must be conditional). Always include a generic search-engine fallback link (`flats for rent in {area} {city}`). Never fabricate portal-specific slugs.

### 4.8 Persistence and sharing
Preferences are serialisable to URL query params (`prefsToQuery`). Direct navigation to `/area/:id` or reload must work: re-hydrate from the cache, or re-fetch that single locality by its stable id. Saved areas persist across sessions via the storage adapter.

---

## 5. Phase 1 UI skeleton specification

**Purpose:** let the human *see every feature, button, and state that exists* so they can design the real UI around it without touching the engine. It is a **wireframe**, not a design.

### 5.1 Rules
- Semantic HTML only. No CSS framework, no component library, no icons, no colours, no fonts chosen. One small `skeleton.css` (≤ 80 lines) that only provides layout and visible outlines so boxes are discernible.
- Every interactive element and every data region has `data-feature="<stable-id>"`; stateful regions also have `data-state="loading|partial|ready|empty|error"`.
- Runs fully in **mock mode** with no network. Mock data is shaped exactly like live data (including `Measured` provenance, `null`s, and low-confidence cases) and is clearly named ("Sample Locality A") with `source: "fixture"`.
- A **scenario switcher** (dev-only) lets the human flip between `normal`, `slow`, `partial`, `empty`, `error`, and `sparse-data` to design every state.
- A dev route **`/_map`** lists every route, every feature id, and links to each scenario: this is the human's table of contents.
- The UI imports only from the engine's public API (lint-enforced).

### 5.2 Screens and controls (all must exist in the skeleton)
| Route | Contents |
| :-- | :-- |
| `/` Home | Name, one-line value statement, "Start" button, "Resume last search" (if cached) |
| `/plan` Preferences (3-step stepper) | **Step 1** city input + workplace input, each with suggestion list and explicit "select" → resolved place chip. **Step 2** transport selector, max-commute control, add/remove extra destinations (label + place, max 3). **Step 3** budget min/max inputs, household selector (student/couple/family/balanced), optional "what matters most" priority controls. Back/Next/Submit, inline validation messages |
| `/results` | Preferences summary + "Edit"; **pipeline progress panel** (stage list + counts); List/Map view toggle (map = labelled placeholder box); sort select (match, commute, amenities, rent); filters (max commute, min match, hide low-confidence); **area cards** (rank, name, match %, confidence badge, 3 key facts, save toggle, compare checkbox, "Details"); sticky "Compare (n)" bar; "Load more"; "Copy share link"; empty/error/partial states |
| `/area/:id` | Header + save toggle; match score + explanation; **score breakdown table** (criterion, points/max, raw value, provenance badge, note); amenity counts with radius; commute per destination (free-flow and peak range, per mode); rent band + "enter known rent" input; safety indicator panel with its disclaimer; map placeholder; portal links; back |
| `/compare?ids=` | 2–3 areas side by side, metric rows, per-row winner marker, remove-area control |
| `/saved` | Saved list, remove, "Compare selected" |
| `/method` | "How it works": weights, data sources, radii, confidence legend, limitations (all read from `engine.method()`, never duplicated copy) |
| `/_map` (dev) | Index of routes, features, scenarios |
| Global | Nav, provenance/confidence legend component, toast/error region, loading and empty components |

### 5.3 Wiring rule
The skeleton must work identically when the engine is later switched from `mock` to `live`. **Switching mode is a single config flag** (`VITE_ENGINE_MODE`), with zero UI changes.

### 5.4 `docs/UI_CONTRACT.md` (deliverable of Phase 1)
For every screen: route, purpose, **controls** (feature id, type, which engine method it calls, arguments), **data shown** (field paths into engine types, and for each: the provenance/confidence behaviour the UI must respect), **states** (loading, partial, empty, error, sparse-data) and what triggers them, and navigation. Include the full TypeScript types the UI consumes, copied from the source, and a "do and don't" list for UI builders (e.g. "always render `source` and `confidence` for every `Measured` value; treat `value === null` as 'not available' and show `note`").

---

## 6. Testing requirements
- **Unit:** scoring (including the budget property tests), normalisation, renormalisation with missing data, commute adjustment, ID and URL serialisation, portal link builders.
- **Parser/contract tests:** use real responses saved in `fixtures/recorded/` (captured by probe scripts, each with `fetchedAt`) to test parsers for Photon, Nominatim, Overpass, and OSRM.
- **Infra:** queue ordering and spacing, backoff, mirror failover, abort propagation, and cache TTL, all with a mocked fetch and fake timers.
- **Pipeline:** with fake providers, assert progressive state, per-locality failure isolation, and abort behaviour.
- **Live smoke (manual, not CI):** `npm run smoke -- --city "<city>"` runs the real pipeline for a city and prints timing, counts, nulls, and errors. Default test city: Pune.
- Never assert something you did not run. Report real command output.

---

## 7. Scope priority (cut from the bottom if a phase overruns 1.5× its time budget)
1. Honest core: discovery → amenities → commute → scoring → ranked results
2. Skeleton UI contract (Phase 1) and persistence/URL sharing
3. Area details with full provenance
4. Compare
5. Saved
6. Portal links
7. Demo-resilience snapshots
8. Transit-mode estimate (stretch)

Never cut: provenance labels, the tests that gate §4.4, or the living docs.

---

## 8. Phase protocol

**At the start of every phase:**
1. Re-read `PROGRESS.md` ("Resume here"), `ARCHITECTURE.md`, `docs/UI_CONTRACT.md`.
2. Write a 5–10 line plan for the phase in `PROGRESS.md`.

**During the phase:** build in small features; commit after each (§2.4). Probe before assuming (§2.2.2).

**At the end of every phase:**
1. Run `npm run check`; run any phase-specific verification and note the real output.
2. Update every doc in §2.5 that the phase touched; refresh "Resume here".
3. Commit `phase(N): <title>` and tag `phase-N`.
4. Post a **phase report** in chat: *Done · Verified (commands + results) · Decisions made · Deviations from the prompt · Known gaps · CONTRACT CHANGES (if any) · Next phase · Questions (with defaults)*. Keep it under ~25 lines.

**Checkpoints:** **stop and wait for the human after Phase 0 (answers to your batched questions) and after Phase 1 (skeleton review).** After that, continue phase to phase without waiting, unless blocked or a breaking contract change is needed.

---

## 9. Phases (time budget for a 30-hour window: about 24 h of build and 6 h of human UI integration and buffer)

| # | Title | Budget |
| :-- | :-- | :-- |
| 0 | Bootstrap and verification | 1.5 h |
| 1 | Contract and UI skeleton (**checkpoint**) | 3 h |
| 2 | Infrastructure layer | 2 h |
| 3 | Geocoding and locality discovery | 3 h |
| 4 | Amenity profile | 2 h |
| 5 | Commute engine | 3 h |
| 6 | Scoring engine and explanations | 2.5 h |
| 7 | Pipeline orchestration, live wiring, persistence | 3 h |
| 8 | Compare, saved, portal links | 1.5 h |
| 9 | Hardening, demo resilience, deploy, final docs | 3 h |

### Phase 0 — Bootstrap and verification
- `git init`, `.gitignore`, Vite + React + TS strict, Vitest, ESLint with the import-boundary rule, `npm run check`, `.env.example`.
- Create all docs from §2.5 with real initial content. Record start time in `PROGRESS.md`.
- Write and run `scripts/probe/*` for Photon, Nominatim, Overpass (each mirror), and OSRM (each candidate host and profile, plus `table`). Save raw samples to `fixtures/recorded/`. Record all findings in `VERIFIED_FACTS.md`, including CORS results and what is `UNVERIFIED`.
- Decide direct-from-browser vs relay per service (`DECISIONS.md`).
- **Acceptance:** `npm run check` passes on the empty skeleton; `VERIFIED_FACTS.md` answers every question in §3.6; boundary lint rule demonstrably fails on a deliberate bad import (then remove it).
- End with the **batched questions** (see §10) and wait.

### Phase 1 — Contract and UI skeleton (checkpoint)
- Define `domain/` types, `Measured<T>`, `Preferences`, `AreaSummary`, `AreaDetail`, `SearchState`, `ComparisonResult`, `MethodInfo`, `PortalLink`.
- Implement the **mock engine** with scenarios (§5.1) behind the final public API (§3.5).
- Build the skeleton UI (§5) and `docs/UI_CONTRACT.md`.
- **Acceptance:** every screen and control in §5.2 exists and works in mock mode; every scenario renders every state; `/_map` lists everything; ESLint proves the UI imports only the public API; `npm run check` passes.
- **Stop for human review.** In the report, list every screen/feature the human will design around.

### Phase 2 — Infrastructure layer
HTTP client (timeout, abort, retries with backoff and jitter), rate-limit queue (configurable concurrency/spacing), mirror failover, cache with TTL (storage adapter: IndexedDB in browser, in-memory for tests). **Acceptance:** infra tests in §6 pass; no feature code uses bare `fetch`.

### Phase 3 — Geocoding and locality discovery
Typeahead provider, city resolution to relation/area id, locality query for node/way/relation with centroids, de-dup, selection and ranking (§4.1), stable ids. **Acceptance:** parser tests on recorded fixtures pass; live smoke on two cities of different shape (one metro, one smaller) returns ≥ the configured N named localities with real coordinates and no hardcoded data; results documented in `VERIFIED_FACTS.md`.

### Phase 4 — Amenity profile
Single-request profile (§4.2), per-category counts, relative normalisation, coverage/confidence, strict null-vs-zero handling. **Acceptance:** counts for a known locality are cross-checked against a manual Overpass query (record both); failed request yields `null`+reason (test); the radius in `MethodInfo` equals the radius queried (test).

### Phase 5 — Commute engine
Routing provider per verified hosts/profiles, `table` batching if verified, per-mode handling, peak heuristic with range output, tier lookup from normalised geocoder fields, multi-destination handling, `docs/CALIBRATION.md`. **Acceptance:** unit tests for the heuristic and tier lookup; live smoke prints free-flow and peak ranges for ≥ 5 localities; disabled/unverified modes are visibly marked.

### Phase 6 — Scoring engine and explanations
Everything in §4.4–4.5 as pure functions plus tests, rent and safety providers with provenance, `dataCompleteness`. **Acceptance:** all property tests pass; sparse-data cases rank sensibly and show lowered completeness; no `||`-defaults for metrics (add a lint or test guard).

### Phase 7 — Pipeline orchestration, live wiring, persistence
Progressive abortable pipeline (§4.6), state persistence, URL sharing, deep-link re-hydration, `VITE_ENGINE_MODE=live`. **Acceptance:** the **unchanged** skeleton UI works end to end in live mode; reload on `/results` and `/area/:id` re-hydrates; cancelling and restarting a search leaves no stale updates; live smoke succeeds for two cities.

### Phase 8 — Compare, saved, portal links
`compare()` with winner logic, `saved` store with cross-tab sync, portal link builders with verified patterns and the fallback search link (§4.7). **Acceptance:** tests pass; links shown only where verified applicable.

### Phase 9 — Hardening, demo resilience, deploy, final docs
Error budget review, request-volume review, cache warm-up and **clearly labelled snapshot data** (real recorded responses with `fetchedAt`, loaded only via an explicit "demo snapshot" mode) for 2–3 cities in case public APIs misbehave on stage; deployment config (SPA rewrites, `api/` only if required); README and all docs audited for staleness against the code; `docs/DEMO_SCRIPT.md` (a 3-minute walkthrough that states honestly what is estimated); optional transit estimate if time remains. **Acceptance:** `npm run check` passes; a clean clone runs per the README; deployed build works; every claim in docs matches the code.

---

## 10. Questions to batch at the end of Phase 0 (use these defaults if unanswered)

1. **Contact for service identification** (`GEO_CONTACT`): which email or URL? *Default: placeholder in `.env.example`.*
2. **Candidates per search (N):** *Default 12, with "load more".*
3. **Rent handling:** *Default: low-confidence tier-band estimate plus user override, no scraping.*
4. **Safety in the match score:** *Default: included at low confidence weight; excluded when coverage is too thin.*
5. **Transit commute mode:** *Default: stretch goal, off in v1.*
6. **Demo cities** to prepare snapshots for: *Default: the human names 2–3; otherwise Pune and one smaller city.*

---

## 11. Begin

Acknowledge in one short message that you have read this prompt, then start **Phase 0** immediately. Do not write feature code before the probes in Phase 0 are done.
