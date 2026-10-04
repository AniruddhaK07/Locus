# Locus — UI Integration Contract

**Document Version:** 1.0.0 (Phase 1 Checkpoint Deliverable)  
**Contract Status:** Stable / Frozen for Human UI Development

This document is the authoritative integration manual for the human UI designer. The React presentation layer talks to the engine **strictly through `src/engine/index.ts`**. The engine is completely framework-agnostic.

---

## 1. Architectural Rules for UI Builders ("Do & Don't")

### DO:
1. **Always render `source` and `confidence`** for every `Measured<T>` metric using the provenance badges (`[osm · high]`, `[heuristic · low]`, etc.).
2. **Treat `value === null` as strictly "Not Available"** and display the accompanying `note`. A null value means the service failed, the tag was unmapped, or data is missing.
3. **Use the `data-feature="<id>"` attribute** on every interactive button, input, card, and state container for automated test coverage and design inspection.
4. **Expose `data-state="loading | ready | partial | empty | error | sparse-data"`** on stateful containers.
5. **Support mode switching:** The wireframe runs in `mock` mode with zero network calls and switches seamlessly to `live` mode via `VITE_ENGINE_MODE=live` without touching any UI component code.

### DON'T:
1. **NEVER import internal engine modules.** Only import from `@engine` (`src/engine/index.ts`). Deep imports like `@engine/scoring/...` or `../engine/config/...` will immediately fail ESLint.
2. **NEVER replace `null` or `0` with made-up defaults.** If commute distance is null, do NOT display a guessed distance. A real `0` count in OSM is not null.
3. **NEVER round or hide provenance caveats.** Do not label a peak commute heuristic as an "exact GPS calculation".
4. **NEVER add commercial API keys.** Locus uses 100% open public services.

---

## CONTRACT CHANGE (additive) — Post-Phase 1 Completeness Audit

1. **`selectAreas(areas, options)` Function:**
   - Exported pure function from `@engine` to eliminate business logic reimplementation in UI redesigns.
   - Signature: `selectAreas(areas: AreaSummary[], options?: SelectAreasOptions): AreaSummary[]`
   - Supports options:
     - `sort?: "match" | "commute" | "amenities" | "rent"`
     - `filters?: { maxCommuteMin?: number; minMatchScore?: number; hideLowConfidence?: boolean }`
     - `limit?: number; offset?: number`
2. **`SearchState.localityErrors`:**
   - Added `localityErrors?: Record<AreaId, string>` to map per-locality failures directly in search state.

---

## 2. Global Dev Capabilities & Scenarios

The dev banner (`ScenarioSwitcher`) at the top of the screen allows flipping between 6 realistic engine scenarios:
- `normal`: 12 discovered localities in Bengaluru, dense metrics, quick response.
- `slow`: Extended step delay (600ms per stage) to inspect pipeline stage progress.
- `partial`: Simulates an Overpass rate limit failure after 3 localities; renders partial results with documented warning.
- `empty`: 0 localities matched, rendering empty state.
- `error`: Fatal network/service failure, rendering error boundary state.
- `sparse-data`: Localities with missing tags, null values, and low data completeness (<50%).

Dev route **`/_map`** lists every route, all 65+ feature IDs, and links to activate each scenario directly.

---

## 3. Screen Specifications & Controls

### Global Shell & Brand Elements
- **Brand Logo:** `data-feature="brand-logo"` — Decorative CSS-masked compass star mark rendered left of the "Locus" wordmark in Header (`aria-hidden="true"`). Follows `--ink` across light and dark themes without SVG filters or layout shift.
- **Home Navigation Link:** `data-feature="nav-home"` — Clickable brand link surrounding `brand-logo` and "Locus" wordmark, keeping accessible name "Locus Home".
- **Team Badge:** `data-feature="team-badge"` — "Built by Meridian" footer container below hairline divider, featuring responsive web-sized derivative (WebP + PNG fallback) and muted caption.
- **Theme Toggle:** `data-feature="theme-toggle"` — Header light/dark mode switch button.

### Screen 1: Home (`/`)
- **Route:** `/`
- **Purpose:** Brand introduction, value statement, search entry point, and search resumption.
- **Controls:**
  | Control | `data-feature` | Action / Engine Call | Arguments |
  | :--- | :--- | :--- | :--- |
  | Start Search Button | `start-btn` | Navigates to `/plan` | — |
  | Resume Search Button | `resume-search-btn` | Reads `localStorage.getItem("locus_last_prefs")` and navigates to `/results` | — |
- **States:** `ready`

---

### Screen 2: Preferences Stepper (`/plan`)
- **Route:** `/plan`
- **Purpose:** Guided 3-step preference configuration.
- **Controls & Data:**
  - **Step 1 (City & Workplace):**
    - `city-input` (`data-feature="city-input"`): Calls `engine.suggestPlaces(query)`.
    - `city-suggestions` (`data-feature="city-suggestions"`): Dropdown list of city suggestions.
    - `city-select-btn` (`data-feature="city-select-btn"`): Sets resolved city chip (`data-feature="city-chip"`).
    - `workplace-input` (`data-feature="workplace-input"`): Calls `engine.suggestPlaces(query, { city })`.
    - `workplace-select-btn` (`data-feature="workplace-select-btn"`): Sets resolved workplace chip (`data-feature="workplace-chip"`).
  - **Step 2 (Commute & Destinations):**
    - `transport-select` (`data-feature="transport-select"`): Select transport mode (`car`, `bike`, `walk`, `transit`).
    - `max-commute-input` (`data-feature="max-commute-input"`): Number input (10–180 minutes).
    - `add-dest-btn` (`data-feature="add-dest-btn"`): Adds up to 3 secondary destinations (Gym, School, etc.).
    - `remove-dest-btn` (`data-feature="remove-dest-btn"`): Removes secondary destination.
  - **Step 3 (Budget & Household):**
    - `budget-min-input` (`data-feature="budget-min-input"`): Number input (₹/mo, optional).
    - `budget-max-input` (`data-feature="budget-max-input"`): Number input (₹/mo, required).
    - `household-select` (`data-feature="household-select"`): Options (`balanced`, `family`, `couple`, `student`).
    - `priority-select` (`data-feature="priority-select"`): Optional priority weighting (`commute`, `budget`, `amenities`, `safety`, `transit`).
  - **Navigation Controls:**
    - `step-back-btn` (`data-feature="step-back-btn"`): Steps back.
    - `step-next-btn` (`data-feature="step-next-btn"`): Validates current step and advances.
    - `submit-search-btn` (`data-feature="submit-search-btn"`): Serializes preferences via `engine.prefsToQuery(prefs)` and routes to `/results?<query>`.
    - `validation-error` (`data-feature="validation-error"`): Displays inline validation errors.
- **States:** `ready`, `validating`

---

### Screen 3: Results (`/results`)
- **Route:** `/results?<params>`
- **Purpose:** Real-time progressive search pipeline, ranked candidate cards, filtering, sorting, list/map view, and comparison triggers.
- **Controls & Engine Calls:**
  | Control | `data-feature` | Action / Engine Call |
  | :--- | :--- | :--- |
  | Search Execution | `results-screen` | Calls `engine.startSearch(prefs)` and subscribes to progressive updates |
  | Edit Preferences | `edit-prefs-btn` | Navigates to `/plan` |
  | Copy Share Link | `copy-share-btn` | Copies current URL with query string to clipboard |
  | Pipeline Stage Panel | `pipeline-progress-panel` | Renders `SearchState.stage`, `progress`, and individual `stage-item` badges |
  | Sort Select | `sort-select` | Re-sorts by `match`, `commute`, `amenities`, `rent` |
  | View Toggle | `view-toggle` | Toggles between List and Map View |
  | Map Placeholder | `map-placeholder` | Interactive map placeholder box |
  | Filter Max Commute | `filter-max-commute` | Sliders filtering results dynamically |
  | Filter Min Match | `filter-min-match` | Sliders filtering results dynamically |
  | Filter Hide Low Conf | `filter-hide-low-conf` | Checkbox filtering out `confidence === 'low'` items |
  | Compare Checkbox | `compare-checkbox` | Toggles item in compare buffer (max 3) |
  | Save Toggle | `save-toggle-btn` | Calls `engine.saved.toggle(area.id)` |
  | Details Link | `details-link` | Navigates to `/area/:id` |
  | Load More | `load-more-btn` | Increases displayed candidate batch |
  | Sticky Compare Bar | `compare-sticky-bar` | Shows count, `clear-compare-btn`, and `compare-btn` (navigates to `/compare?ids=...`) |
- **Data Displayed:**
  - `area.rank`: Integer (1..N).
  - `area.name`: Locality name.
  - `area.matchScore`: Honest score (0–100).
  - `area.confidence`: `"high" | "medium" | "low" | "none"`.
  - `area.dataCompleteness`: Percentage of score supported by real data.
  - `area.explanation`: Plain English explanation.
  - `area.keyFacts`: 3 highlights.
  - `area.effectiveCommuteMin`: Measured commute.
  - `area.rentBand`: Heuristic range `{low, high}`.
- **States:** `loading`, `ready`, `partial`, `empty`, `error`

---

### Screen 4: Area Detail (`/area/:id`)
- **Route:** `/area/:id` (URL encoded stable ID, e.g. `/area/node%2F429918282`)
- **Purpose:** Full transparency breakdown of locality metrics, amenity counts, commute breakdowns, rent overrides, and portal deep links.
- **Controls & Data:**
  - `save-toggle-btn` (`data-feature="save-toggle-btn"`): Toggles saved state.
  - `score-table` (`data-feature="score-table"`): Full table of criteria (`points`, `maxPoints`, `effectiveWeight`, `raw.value`, `raw.source`, `raw.confidence`, `raw.note`).
  - `commute-breakdown` (`data-feature="commute-breakdown"`): Per-destination cards showing free-flow vs peak heuristic estimate.
  - `amenity-grid` (`data-feature="amenity-grid"`): Separate real counts for grocery (800m), food (800m), healthcare (1500m), education (1500m), leisure (1500m), bus (500m), rail (1500m).
  - `rent-override-input` (`data-feature="rent-override-input"`) & `save-rent-btn`: Calls `engine.setRentOverride(id, rent)`. Promotes confidence to `user` (`high`).
  - `safety-panel` (`data-feature="safety-panel"`): Police count, lit roads count, surveillance nodes, disclaimer.
  - `portal-links` (`data-feature="portal-links"`): Buttons calling verified deep links (Housing, 99acres, MagicBricks, Google Search fallback).
- **States:** `loading`, `ready`, `sparse-data`, `error`

---

### Screen 5: Comparison (`/compare?ids=...`)
- **Route:** `/compare?ids=id1,id2,id3`
- **Purpose:** Side-by-side comparison of 2 to 3 candidate areas.
- **Controls & Data:**
  - Calls `engine.compare(ids)`.
  - `comparison-table` (`data-feature="comparison-table"`): Matrix of attributes.
  - `winner-marker` (`data-feature="winner-marker"`): Marked with `.winner` class highlighting the winning locality per row.
  - `remove-area-btn` (`data-feature="remove-area-btn"`): Drops locality from comparison.
- **States:** `loading`, `ready`, `empty`

---

### Screen 6: Saved Localities (`/saved`)
- **Route:** `/saved`
- **Purpose:** Shortlist management with persistence across reloads.
- **Controls & Data:**
  - Calls `engine.saved.list()` and `engine.getArea(id)`.
  - `remove-saved-btn` (`data-feature="remove-saved-btn"`): Calls `engine.saved.toggle(id)`.
  - `compare-selected-btn` (`data-feature="compare-selected-btn"`): Triggers compare on selected checkboxes.
- **States:** `loading`, `ready`, `empty`

---

### Screen 7: Methodology & Limitations (`/method`)
- **Route:** `/method`
- **Purpose:** Complete public disclosure of engine weights, radii, routing availability, confidence rules, and limitations.
- **Controls & Data:**
  - All content dynamically populated from `engine.method()`.
  - `weights-table`, `radii-table`, `routing-profiles-table`, `confidence-legend`, `limitations-list`.
- **States:** `ready`

---

### Screen 8: Developer Route Map (`/_map`)
- **Route:** `/_map`
- **Purpose:** Complete catalog and table of contents for designers.
- **Controls:**
  - Direct scenario toggles (`normal`, `slow`, `partial`, `empty`, `error`, `sparse-data`).
  - Direct links to every route with sample query parameters.
  - Complete list of all 65+ `data-feature` tags.
- **States:** `ready`

---

## 4. Complete TypeScript API Types

```ts
export type Source = "osm" | "routing" | "heuristic" | "user" | "fixture" | "unavailable";
export type Confidence = "high" | "medium" | "low" | "none";

export interface Measured<T> {
  value: T | null;
  source: Source;
  confidence: Confidence;
  note?: string;
  fetchedAt?: string;
}

export type AreaId = string;
export type TransportMode = "car" | "bike" | "walk" | "transit";
export type HouseholdType = "student" | "couple" | "family" | "balanced";

export interface Destination {
  id: string;
  label: string;
  name: string;
  lat: number;
  lon: number;
}

export interface Preferences {
  city: string;
  workplace: Destination;
  destinations: Destination[];
  transportMode: TransportMode;
  maxCommuteMin: number;
  budgetMin?: number;
  budgetMax: number;
  householdType: HouseholdType;
  priorityFocus?: "budget" | "commute" | "safety" | "amenities" | "transit";
}

export interface AreaSummary {
  id: AreaId;
  name: string;
  lat: number;
  lon: number;
  rank: number;
  matchScore: number;
  confidence: Confidence;
  dataCompleteness: number;
  explanation: string;
  keyFacts: string[];
  effectiveCommuteMin: Measured<number>;
  rentBand: Measured<{ low: number; high: number }>;
  safetyIndicator: Measured<number>;
  amenitiesScore: Measured<number>;
}

export interface AreaDetail extends AreaSummary {
  osmType: "node" | "way" | "relation";
  osmId: number;
  amenities: AmenityCounts;
  commutes: CommuteEstimate[];
  scoreBreakdown: ScoreCriterion[];
  userRentOverride?: number;
  safetyDetails: {
    policeCount: Measured<number>;
    litRoadsCount: Measured<number>;
    surveillanceCount: Measured<number>;
    coverageNote: string;
  };
}

export interface Engine {
  suggestPlaces(query: string, hint?: { city?: string }, signal?: AbortSignal): Promise<PlaceSuggestion[]>;
  startSearch(prefs: Preferences): SearchHandle;
  getArea(id: AreaId): Promise<AreaDetail | null>;
  setRentOverride(id: AreaId, rent: number | null): Promise<AreaDetail | null>;
  compare(ids: AreaId[]): Promise<ComparisonResult>;
  saved: {
    list(): AreaId[];
    toggle(id: AreaId): void;
    has(id: AreaId): boolean;
    subscribe(cb: () => void): () => void;
  };
  portals(area: AreaSummary): PortalLink[];
  method(): MethodInfo;
  prefsToQuery(p: Preferences): string;
  queryToPrefs(q: string): Preferences | null;
}
```
