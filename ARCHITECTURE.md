# Locus — Architecture & Technical Specification

## 1. Architectural Philosophy: The Two Halves

Locus is built as two strictly separated layers:

1. **Calculation Engine (`src/engine/`):**
   - Pure, framework-agnostic TypeScript.
   - Absolutely zero dependency on React, React DOM, or UI frameworks.
   - Browser and Node environments interact via injected adapters (storage, HTTP fetch).
   - Manages geocoding, locality discovery, amenity profiling, routing, rent estimates, safety indicators, scoring, caching, rate limiting, and progressive orchestration.

2. **Presentation Layer (`src/ui/`):**
   - Thin React application.
   - Consumes **only** the public engine interface exported at `src/engine/index.ts`.
   - Never accesses internal engine modules or config directly.
   - Decoupled so that a human designer can replace or redesign the UI without touching calculation logic.

### Boundary Enforcement
Enforced by ESLint (`eslint.config.js`) via `no-restricted-imports`:
- `src/ui/**` cannot import from `src/engine/!(index)`.
- `src/engine/**` cannot import from `react`, `react-dom`, `react-router-dom`, or `src/ui/**`.

---

## 2. Core Abstractions & Provenance Pattern

### 2.1 The `Measured<T>` Pattern
Every single metric presented to the user carries provenance:

```ts
export type Source = "osm" | "routing" | "heuristic" | "user" | "fixture" | "unavailable";
export type Confidence = "high" | "medium" | "low" | "none";

export interface Measured<T> {
  value: T | null;          // null = not available (never a guessed default)
  source: Source;
  confidence: Confidence;
  note?: string;            // explanation when null or caveat when estimated
  fetchedAt?: string;       // ISO timestamp
}
```

### 2.2 Public Engine API Contract

```ts
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

export interface SearchHandle {
  id: string;
  getState(): SearchState;
  subscribe(cb: (s: SearchState) => void): () => void;
  cancel(): void;
}
```

---

## 3. Algorithm Specifications & Tunable Constants

All constants reside in `src/engine/config/` (or engine mock/defaults) with clear provenance tags: `VERIFIED`, `SOURCED(...)`, or `HEURISTIC`.

### 3.1 Scoring Weights (`HEURISTIC`)
- Budget: 28
- Commute: 27
- Safety: 18
- Amenities: 12
- Transit Access: 8
- Household Fit: 7
Total Base Weight: 100

### 3.2 Confidence Weight Reductions (`HEURISTIC`)
- High: `1.0`
- Medium: `0.7`
- Low: `0.35`
- None: `0.0`
Effective weight = `baseWeight * confidenceFactor`. Renormalization occurs only over criteria with non-null values.

### 3.3 Commute Peak Adjustment Heuristic (`HEURISTIC`)
```
T_peak = T_freeflow * (1 + alpha_city * (1 - exp(-d / 8)))
```
Starter `alpha_city` tiers (`HEURISTIC`):
- Tier 1 Mega-Metro (Mumbai, Delhi, Bengaluru): `2.3`
- Tier 1 Dense Metro (Kolkata, Chennai, Hyderabad): `1.9`
- Other Large Metro (Pune, Ahmedabad): `1.6`
- Everything else: `1.2`

### 3.4 Budget Utility Function (`VERIFIED` formula)
Let $R_{min}, R_{max}$ be user budget bounds. Default $R_{min} = 0.4 \times R_{max}$ if unspecified.
$R_t = R_{min} + 0.75 \times (R_{max} - R_{min})$.
- $R_{min} \le R \le R_t \implies U = 1.0$
- $R_t < R \le R_{max} \implies U = 1.0 - 0.3 \times \frac{R - R_t}{R_{max} - R_t}$ (linear descent from 1.0 to 0.7)
- $R > R_{max} \implies U = 0.7 \times \exp\left(-4 \times \frac{R - R_{max}}{R_{max}}\right)$
- $R < R_{min} \implies U = \max\left(0.7, 1.0 - 0.3 \times \frac{R_{min} - R}{R_{min}}\right)$

---

## 5. Infrastructure Layer (`src/engine/infra/`)

All network communication and client-side persistence pass through dedicated infrastructure modules:

1. **Storage Adapters (`src/engine/infra/storage.ts`):**
   - `StorageAdapter` interface: `get`, `set`, `delete`, `clear`.
   - `MemoryStorageAdapter`: In-memory storage for test runners and non-browser runtimes.
   - `IndexedDBStorageAdapter`: Persistent IndexedDB cache for browsers (`locus_cache_db`), supporting expiration timestamps (`expiresAt`).
2. **Response Cache (`src/engine/infra/cache.ts`):**
   - Wraps storage adapter with default 24-hour TTL (`defaultTtlMs = 86_400_000`).
   - Serves cache hits instantly without triggering network requests or queuing delays.
3. **Rate-Limiting Queue (`src/engine/infra/queue.ts`):**
   - Enforces strict concurrency limits (`concurrency`, e.g. 1 for Overpass, 2 for Nominatim/OSRM).
   - Enforces minimum spacing between request dispatches (`minSpacingMs`, e.g. ≥ 700 ms for Overpass).
   - Fully supports `AbortSignal` cancellation: pending tasks are removed from the queue without execution.
4. **Resilient HTTP Client (`src/engine/infra/httpClient.ts`):**
   - Timeout handling: via caller `signal` combined with request-level timeout.
   - Retries with exponential backoff and randomized jitter (factor $0.8$ to $1.2$) on HTTP 429 and 5xx (500–504).
   - Mirror Failover: When configured with `MirrorConfig` (e.g. Overpass mirror pool), automatically fails over to the next healthy mirror upon network error or 5xx response.
   - Zero bare `fetch` calls in provider or feature code.

---

## 4. Pipeline Stages

The search pipeline executes progressively through 6 stages:
1. `resolving-city`: Geocodes city to OSM administrative boundary / relation.
2. `discovering-localities`: Fetches candidates via Overpass, ranks by distance to primary anchor, filters impossible commutes, keeps top $N=12$.
3. `routing`: Batches transit/commute requests via OSRM `table` or route calls.
4. `profiling-amenities`: Queries real amenity counts per locality category.
5. `scoring`: Computes honest scores, confidence adjustments, and completeness.
6. `done`: Pipeline completes.

---

## 5. External Services & Direct Browser Communication

- **Photon (`https://photon.komoot.io`):** Typeahead place suggestion. Direct browser request with CORS (`access-control-allow-origin: *`).
- **OSM Nominatim (`https://nominatim.openstreetmap.org`):** On-submit city boundary resolution only. Identified via optional email query param or Referer origin. Autocomplete strictly forbidden on Nominatim.
- **Overpass API (`https://overpass-api.de/api`):** Roland Olbricht cluster. Concurrency = 1 with ≥ 700 ms spacing to respect IP slot limits (2–4 slots). Direct browser queries avoid shared server IP starvation.
- **OSRM Multi-Modal (`https://routing.openstreetmap.de`):** Dedicated endpoints (`routed-car`, `routed-bike`, `routed-foot`) supporting route and `/table` matrix queries with `CORS: *`. Demo host `router.project-osrm.org` used only for car fallback.
