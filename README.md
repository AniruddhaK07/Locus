# Locus

> **Honest neighbourhood discovery and relocation intelligence for India.**  
> Built on $0 infrastructure, zero proprietary API keys, real OpenStreetMap graph data, and zero fabricated numbers.

Locus helps a person relocating within India decide **where to live**.

Users specify a city, a workplace, up to 3 regular destinations, a budget range, a maximum commute, a transport mode, and a household type. Locus discovers real neighbourhoods using live OpenStreetMap data, measures local amenities and connectivity, calculates honest commute estimates, and presents a ranked list with a transparent score breakdown, plain-English explanations, side-by-side comparisons, and links to verified rental searches.

---

## Core Principles

1. **Honesty over False Precision:** Every number displayed states where it originated, how it was derived, and its confidence level. If data is missing, it is shown as `null` with a clear explanation—never hidden behind fabricated defaults or silent fallbacks.
2. **$0 Infrastructure:** Built entirely on open-source OpenStreetMap ecosystem services (Nominatim, Overpass API, OSRM, Photon) without requiring paid API keys or proprietary relays.
3. **Any Indian City:** No hardcoded city or locality datasets; candidate localities and admin areas are discovered dynamically.
4. **Strict Decoupling:** The framework-agnostic calculation engine (`src/engine/`) is completely decoupled from the React presentation UI (`src/ui/`), enforced by ESLint boundary rules.

---

## Getting Started

### Prerequisites

- Node.js LTS (v20+ or v22+)
- npm 10+

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/AniruddhaK07/Locus.git
   cd Locus
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configuration (`.env`):
   ```bash
   cp .env.example .env
   ```
   Available engine modes in `.env`:
   - `VITE_ENGINE_MODE=mock`: Fast offline development with scenario switching (`normal`, `slow`, `partial`, `empty`, `error`, `sparse-data`).
   - `VITE_ENGINE_MODE=snapshot`: Pre-recorded authentic responses captured from live runs with verified `fetchedAt` timestamps for Delhi, Bengaluru, and Pune (guaranteed 100% stage resilience).
   - `VITE_ENGINE_MODE=live`: Real-time querying of public Nominatim, Overpass, and OSRM endpoints.

---

## Running the Application

- **Development Server:**
  ```bash
  npm run dev
  ```
  Open `http://localhost:5173`.
- **Quality & Test Gate:**
  ```bash
  npm run check
  ```
  Runs TypeScript typechecking (`tsc --noEmit`), ESLint with architectural boundary verification, and Vitest test suites (112 tests across 11 suites).
- **Production Build:**
  ```bash
  npm run build
  npm run preview
  ```
- **Live Smoke Test:**
  ```bash
  npm run smoke -- --city "Pune"
  ```
  Runs an end-to-end live pipeline run against external Overpass, Nominatim, and OSRM endpoints and prints timings, candidate counts, and score rankings.

---

## UI Presentation Layer

The Locus presentation layer (`src/ui/`) is a minimalist, magazine-editorial interface adhering to strict honesty rules:
- **Design Philosophy:** Warm, confident editorial design (Fraunces serif headings, Inter sans UI text). Closer to an architectural magazine than a generic dashboard.
- **Design Tokens:** All visual values are defined strictly in `src/ui/styles/tokens.css` with zero hex literals elsewhere and full WCAG 2.2 AA and AAA compliance.
- **Dark Mode Support:** Built-in espresso-charcoal dark mode (`--bg: #1F1D20`, `--ink: #FFF3EB`) with system detection (`@media (prefers-color-scheme: dark)`) and a header theme toggle button (`data-feature="theme-toggle"`).
- **Self-Contained Cartographic Map (`LocusMap.tsx`):** Responsive SVG cartography that normalizes geographic `lat/lon` coordinates to an SVG bounding box with diamond workplace markers, candidate rank pins, interactive tooltips, and mandatory OpenStreetMap ODbL attribution. Works 100% offline with zero external map tiles or API keys.
- **Zero External CDN Dependencies:** Self-hosted fonts bundled via npm `@fontsource/*` with zero runtime external script or font requests.
- **Elimination of Legacy Styles:** Wireframe `skeleton.css` has been permanently eliminated; all 7 screens use scoped CSS modules and design tokens.
- **Screens Implemented:**
  1. `/` — Home screen with editorial typography and primary Start CTA.
  2. `/plan` — 3-step accessible preferences stepper with combobox typeahead, transit mode options, budget sliders, and household presets.
  3. `/results` — Single-column reading-width candidate list (~760px) with progressive pipeline progress, multi-criteria filtering, and desktop side-by-side cartographic map split.
  4. `/area/:id` — Deep locality breakdown with score points table, measured amenity radii (walk times at 5 km/h), rent band with user override and rescoring, and physical safety infrastructure indicators.
  5. `/compare` — Side-by-side metric matrix comparing candidate localities with sticky pinned metric headers for mobile horizontal scrolling and winner markers.
  6. `/saved` — Persistent saved shortlist with live count badge, comparison shortcuts, and clipboard share integration.
  7. `/method` — Complete methodology transparency route detailing base weights, query radii, routing status, provenance legend, and an interactive weighting simulator.
- **Engine Modes & Explicit Toggle:**
  - `mock`: Default for offline development (`VITE_ENGINE_MODE=mock`). Renders quiet "Sample data" banner.
  - `snapshot`: Recorded live data sessions (`VITE_ENGINE_MODE=snapshot` or `?engine=snapshot`). Renders "Recorded demo data · captured {date}" with a quiet "Switch to live search" link.
  - `live`: Live OpenStreetMap network querying (`VITE_ENGINE_MODE=live` or `?engine=live`). Quiet/no banner.
  - **URL & Tab Persistence:** Pass `?engine=snapshot` or `?engine=live` to switch modes instantly. Remembers choice per browser tab (`sessionStorage`).
  - **Honest Error Handling:** When external OSM services reject requests (e.g. Overpass 406 on deployed sites) or time out, Locus displays honest diagnostics, never displays "Search complete", and offers both "Try again" and "Use recorded demo cities".
- **Dev Tools:**
  - Route Catalog (`/_map`): Complete directory of all routes, mock scenario triggers, and contract handles.
  - Primitives Showcase (`/primitives`): Demonstrates every UI primitive in every supported state.
  - Production Gating: Dev tools and scenario switchers are gated via `isDevMode()` (`import.meta.env.DEV`, `?dev=1`, or `locus_dev=1`).
- **Testing & Verification:**
  ```bash
  npm run check           # Typecheck + ESLint + 20 test suites (178 unit tests)
  npm run check:features  # UI Contract feature ID guard
  npm run build           # Production bundle build
  ```



---

## 3-Minute Demo Walkthrough

See **[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md)** for a complete 3-minute honest walkthrough covering:
1. Preference entry on `/plan` (City, Workplace anchor, Transport mode, Budget, Household fit).
2. Progressive 6-stage pipeline on `/results` (`resolving-city` $\rightarrow$ `discovering-localities` $\rightarrow$ `routing` $\rightarrow$ `profiling-amenities` $\rightarrow$ `scoring` $\rightarrow$ `done`).
3. Locality inspection on `/area/:id` (Raw metrics, points/max, provenance badges, rent override with instant rescore).
4. Side-by-side comparison on `/compare` and persistent saved shortlist on `/saved`.
5. Public transparency route on `/method` (Dynamic display of weights, radii, formulas, and limitations).

---

## Architecture & Data Provenance

```
/
├─ README.md              # Project overview, setup, running instructions
├─ ARCHITECTURE.md        # Architecture, data flow, constants, and API contract
├─ PROGRESS.md            # Living build tracker with "Resume here" block
├─ vercel.json            # Vercel SPA rewrite configuration
├─ public/_redirects      # Netlify / Cloudflare SPA rewrite configuration
├─ docs/
│  ├─ DEMO_SCRIPT.md      # 3-minute honest walkthrough script
│  ├─ MASTER_PROMPT.md    # Source specification & requirements
│  ├─ DECISIONS.md        # Architectural decision records (ADRs)
│  ├─ VERIFIED_FACTS.md   # Probed realities of external APIs
│  ├─ DATA_PROVENANCE.md  # Metric definitions, source tags, confidence rules
│  ├─ CALIBRATION.md      # Commute alpha congestion calibration table
│  └─ UI_CONTRACT.md      # UI integration contract and state guide
├─ fixtures/
│  ├─ recorded/           # Captured raw responses from external probes
│  └─ snapshots/          # Pre-recorded offline demo snapshots (Delhi, Bengaluru, Pune)
├─ src/
│  ├─ engine/             # Framework-agnostic TS calculation engine (isolated)
│  │  ├─ domain/          # Core domain types and selection functions
│  │  ├─ infra/           # HTTP client, rate-limit queues, mirror failover, cache
│  │  ├─ providers/       # Geocoding, Overpass, OSRM, Rent providers
│  │  ├─ scoring/         # Budget utility, safety indicator, match scoring, explanations
│  │  ├─ pipeline/        # 6-stage progressive search orchestrator
│  │  ├─ features/        # Side-by-side compare, saved store, portal links
│  │  ├─ live/            # LiveEngine implementation
│  │  ├─ snapshot/        # SnapshotEngine demo resilience implementation
│  │  └─ mock/            # MockEngine implementation & scenario fixtures
│  └─ ui/                 # React presentation layer (consumes @engine only)
└─ tests/                 # Unit, contract, and property test suites
```

---

## Honest Models & Disclaimers

- **Commute Peak Estimation:** Free-flow road network travel times are calculated directly from OpenStreetMap road graphs via OSRM. Peak commute times are calculated via an empirical non-linear congestion model:
  $$T_{\text{peak}} = T_{\text{freeflow}} \times (1 + \alpha_{\text{city}} \times (1 - \exp(-d / 8)))$$
  where $\alpha_{\text{city}}$ is derived strictly from administrative geocoder tags (e.g. 2.3 for Mega-Metros, 1.9 for Dense Metros).
- **Rental Prices:** Sourced from starter municipal tier bands scaled by locality centrality and amenity density, not live broker listings. Users can input a verified rent override on any locality for instant, high-confidence rescoring.
- **Safety Indicator:** Sourced exclusively from physical OpenStreetMap infrastructure tags (`amenity=police`, `way[lit=yes]`, `node[man_made=surveillance]`). Explicitly labelled: *"Infrastructure indicator based on physical features, not police crime data."*
- **Transit Mode:** Public transit GTFS schedules are currently unavailable via unauthenticated open APIs in most Indian cities. Transit commute routing is honestly marked `DISABLED/UNVERIFIED (null)` in v1.
