# Locus

Locus helps a person relocating within India decide **where to live**.

Users specify a city, a workplace, up to 3 regular destinations, a budget range, a maximum commute, a transport mode, and a household type. Locus discovers real neighbourhoods using live OpenStreetMap data, measures local amenities and connectivity, calculates honest commute estimates, and presents a ranked list with a transparent score breakdown, plain-English explanations, and links to property portals.

## Principles

- **Honesty over false precision:** Every number displayed states where it originated, how it was derived, and its confidence level.
- **$0 infrastructure:** Built on free public OpenStreetMap ecosystem services without requiring paid API keys.
- **Any Indian city:** No hardcoded city or locality datasets; localities are discovered dynamically.
- **Strict architectural decoupling:** The TypeScript calculation engine (`src/engine/`) is completely decoupled from the React UI (`src/ui/`).

---

## Getting Started

### Prerequisites

- Node.js LTS (v20+ or v22+)
- npm 10+

### Setup

1. Clone or open the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   Create a `.env` file in the project root (optional):
   ```bash
   # Optional: Nominatim email parameter (relies on browser Referer if omitted)
   GEO_CONTACT=your_email@example.com
   # Mode: "mock" (default, runs offline) or "live"
   VITE_ENGINE_MODE=mock
   ```

### Running the App

- **Mock Mode (Default):** Runs offline using deterministic fixtures.
  ```bash
  npm run dev
  ```
- **Live Mode:** Queries live OSM/Photon/Overpass/OSRM endpoints.
  Set in `.env`:
  ```bash
  VITE_ENGINE_MODE=live
  ```
  Then run `npm run dev`.

---

## Scripts

- `npm run check`: Typecheck, lint, and run unit tests. **Gates all commits.**
- `npm run dev`: Launch local Vite dev server.
- `npm run build`: Typecheck and produce production bundle in `dist/`.
- `npm run preview`: Preview production build locally.
- `npm run test`: Run unit and contract tests via Vitest.
- `npm run lint`: Lint TypeScript and React codebase via ESLint.
- `npm run smoke`: Run live smoke test against external OSM/Photon/Overpass services.

---

## Project Structure

```
/
├─ README.md              # Project overview, setup, running instructions
├─ ARCHITECTURE.md        # Architecture, data flow, constants, and API contract
├─ PROGRESS.md            # Living build tracker with "Resume here" block
├─ docs/
│  ├─ MASTER_PROMPT.md    # Source specification
│  ├─ DECISIONS.md        # Lightweight architectural decision log
│  ├─ VERIFIED_FACTS.md   # Probed realities of external APIs
│  ├─ DATA_PROVENANCE.md  # Metric definitions, source tags, confidence rules
│  └─ UI_CONTRACT.md      # UI integration contract and state guide
├─ scripts/probe/         # Live probing scripts for external APIs (not run in CI)
├─ fixtures/recorded/     # Captured real responses from probed endpoints
├─ src/
│  ├─ engine/             # Framework-agnostic TS calculation engine (isolated)
│  └─ ui/                 # React presentation layer (consumes engine public API only)
└─ tests/                 # Unit and contract tests
```
