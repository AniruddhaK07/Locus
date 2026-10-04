# Locus — UI Integration Contract

This contract defines the strict interface between the headless Calculation Engine (`src/engine/`) and the presentation UI (`src/ui/`).

## Architectural Invariants for UI Builders

1. **Import Only from `@engine`:** Never import internal engine modules directly. All types, methods, and constants must be imported from `src/engine/index.ts` (or the `@engine` alias).
2. **Respect `Measured<T>` Provenance:**
   - Every metric has `{ value, source, confidence, note? }`.
   - Never display a bare number without rendering its confidence and source badge.
   - If `value === null`, render the `note` or state "Not available"; **never** replace `null` with a fallback or guessed value like `0` or `"N/A"`.
3. **Data Feature Tags:** Every interactive control and data display must carry a `data-feature="<id>"` attribute for automated verification.
4. **State Machine Awareness:** Stateful regions must expose `data-state="loading | partial | ready | empty | error | sparse-data"`.

---

## Screen Inventory & Controls (Wireframe Specification)

| Route | Screen Name | Engine API Method | Key Controls / Features | States |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Home | `engine.saved.list()` | `start-btn`, `resume-search-btn` | `ready` |
| `/plan` | Preferences Stepper | `engine.suggestPlaces()`, `engine.startSearch()` | Step 1 (City & Workplace inputs, chips); Step 2 (Mode, max commute, +3 destinations); Step 3 (Budget min/max, household type, priorities) | `ready`, `validating` |
| `/results` | Search Results | `engine.startSearch()`, `engine.saved.toggle()` | `progress-panel`, `view-toggle`, `sort-select`, `filter-panel`, `area-card`, `compare-bar`, `load-more-btn`, `share-btn` | `loading`, `partial`, `ready`, `empty`, `error` |
| `/area/:id` | Area Detail | `engine.getArea(id)`, `engine.portals(area)` | `save-toggle`, `score-table`, `amenity-grid`, `commute-breakdown`, `rent-override-input`, `safety-panel`, `portal-links` | `loading`, `ready`, `error`, `sparse-data` |
| `/compare?ids=` | Side-by-Side Comparison | `engine.compare(ids)` | `comparison-table`, `metric-row`, `winner-badge`, `remove-area-btn` | `loading`, `ready`, `error` |
| `/saved` | Saved Localities | `engine.saved.list()`, `engine.saved.toggle()` | `saved-list`, `remove-btn`, `compare-selected-btn` | `ready`, `empty` |
| `/method` | Methodology & Limitations | `engine.method()` | `weights-table`, `radii-table`, `provenance-legend`, `limitations-panel` | `ready` |
| `/_map` | Dev Route Index | Internal | Route & feature table of contents, scenario switcher | `ready` |

---

## TypeScript Core Types (Preview)

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

export type AreaId = string; // e.g. "node/12345" or "relation/67890"

export interface Preferences {
  city: string;
  workplace: { name: string; lat: number; lon: number };
  destinations: Array<{ label: string; name: string; lat: number; lon: number }>;
  transportMode: "car" | "bike" | "walk" | "transit";
  maxCommuteMin: number;
  budgetMin?: number;
  budgetMax: number;
  householdType: "student" | "couple" | "family" | "balanced";
}
```
*(Full types will be finalized in Phase 1 and frozen for UI development).*
