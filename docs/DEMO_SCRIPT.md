# Locus — 3-Minute Live Demo Script & Walkthrough

This script provides an honest, rigorous 3-minute demonstration of **Locus** for hackathon judges, technical reviewers, and relocating users. It highlights our strict adherence to zero-fabrication data engineering, transparent confidence tracking, and open-source infrastructure ($0 cost, zero proprietary keys).

---

## Pre-Flight Checklist (10 seconds)

1. Verify environment running locally:
   ```bash
   npm run check   # Ensure all 112 tests pass cleanly
   npm run dev     # Starts dev server on http://localhost:5173
   ```
2. Available engine modes:
   - `VITE_ENGINE_MODE=live`: Queries live Nominatim, Overpass API, and OSRM endpoints.
   - `VITE_ENGINE_MODE=snapshot`: Offline stage-resilient mode using authentic recorded responses (`fetchedAt: 2026-10-04`) for Delhi, Bengaluru, and Pune.
   - `VITE_ENGINE_MODE=mock`: Instant UI testbed with scenario controls.

---

## Step 1: The Relocation Problem & Value Statement (0:00 – 0:30)

> *"When someone relocates to a new Indian city for work, real-estate portals overwhelm them with sponsored broker listings and generic claims. Nobody tells you: 'If you work in Hinjawadi or Bellandur, where can you actually live that keeps your peak commute under 35 minutes, gives you groceries within walking distance, and fits your budget?'*
>
> *Locus solves this with $0 external infrastructure and 0 proprietary API keys. We use raw OpenStreetMap network graphs, real Overpass amenity polygons, and transparent multi-criteria utility scoring. Every single number shown has an explicit provenance tag and confidence rating."*

**Action:** Open home page (`/`). Click **"Start Planning →"**.

---

## Step 2: Preference Entry & Calibration (0:30 – 1:00)

**Screen:** `/plan` (3-Step Guided Stepper)

1. **Step 1 (City & Workplace):**
   - Type `Pune` in the city field. Notice Photon typeahead suggestion.
   - Type `Hinjawadi Phase 1` as the workplace anchor.
   - Click **"Next →"**.
2. **Step 2 (Commute & Transit Mode):**
   - Transport mode: `Car` (or `Bike`).
   - Max acceptable commute: `45 minutes`.
   - Optional extra destination: Add `Gym` or second office.
   - Click **"Next →"**.
3. **Step 3 (Budget & Lifestyle Persona):**
   - Target monthly rent: `₹25,000`.
   - Household persona: Select `Balanced` or `Family` (emphasizes schools & healthcare).
   - Priority boost: Select `Commute`.
   - Click **"Find Best Localities →"**.

---

## Step 3: Progressive Live Pipeline & Honest Ranking (1:00 – 1:45)

**Screen:** `/results`

1. **Observe Pipeline Progression:**
   - Watch the live progress panel transition smoothly across 6 stages:
     `Resolving City Boundary` $\rightarrow$ `Discovering Candidate Localities` $\rightarrow$ `Routing Road Matrix` $\rightarrow$ `Profiling Overpass Amenities` $\rightarrow$ `Multi-Criteria Scoring` $\rightarrow$ `Complete`.
   - In live mode, candidate batches render progressively without freezing the browser.
2. **Highlight Top Results:**
   - Show ranked results (e.g. #1 Narayan Peth, #2 Sadashiv Peth, #3 Deccan Gymkhana).
   - Point out the **Provenance Badge** on each card:
     - `osm` with `high` or `medium` confidence for physical entities.
     - `heuristic` with `low` confidence for peak commute estimates.
   - Point out **Data Completeness** (e.g., `100%` or `74%`):
     > *"Notice that we do not fabricate missing data. If an area lacks streetlighting tags or transit data, its completeness percentage visibly drops, and our scoring engine renormalizes weights without inventing fake ratings."*

---

## Step 4: Honest Area Deep-Dive & Rent Override (1:45 – 2:30)

**Screen:** `/area/:id` (Click "Details" on #1 Locality)

1. **Score Breakdown Table:**
   - Review each criterion row: `Budget`, `Commute`, `Safety`, `Amenities`, `Transit`, `Household`.
   - Show columns: `Points / Max`, `Effective Weight`, `Raw Measured Metric`, and `Provenance Badge`.
2. **State What is Directly Measured vs Estimated Honestly:**
   - **Directly Measured (Authoritative):**
     - OSRM graph distance and uncongested free-flow travel time.
     - OpenStreetMap amenity counts within strictly audited radii (800m grocery/cafes, 1500m hospitals/schools).
     - Physical safety infrastructure (police stations, lit ways, CCTV nodes).
   - **Estimated Heuristics (Transparently Labelled):**
     - **Peak Commute:** Scaled by the non-linear congestion formula $T_{\text{peak}} = T_{\text{freeflow}} \times (1 + \alpha_{\text{city}} \times (1 - \exp(-d/8)))$ because live traffic APIs charge hundreds of dollars per day.
     - **Rent Band:** Baseline municipal tier-band estimate, not live broker listings.
   - **Explicit Disclaimers:**
     - Safety is labelled: *"Infrastructure indicator based on physical OSM features, not police crime data."*
     - Transit schedule routing: Marked `DISABLED/UNVERIFIED` with reason *"Public transit GTFS schedule APIs unavailable"*.
3. **Interactive User Rent Override:**
   - Type `₹30,000` in the "Enter known rent" input and click **"Save Rent Override"**.
   - Watch the match score and budget points update instantly! The provenance badge immediately promotes to **`source: user, confidence: high`**.

---

## Step 5: Compare, Saved Shortlist & Verified Portals (2:30 – 3:00)

**Screens:** `/saved`, `/compare`, `/method`

1. **Compare 2–3 Localities:**
   - Select 2 localities and navigate to `/compare`.
   - Show the side-by-side comparison matrix with per-row winner indicators (highest match, lowest commute, lowest rent, richest amenities).
   - Point out tie handling: equal metrics have no winner arbitrarily picked.
2. **Saved Shortlist with Cross-Tab Sync:**
   - Toggle localities into the shortlist (`/saved`). Open in a second tab to demonstrate instant `StorageEvent` synchronization.
3. **Verified Portal Links:**
   - Click external portal links: MagicBricks, Housing.com, 99acres, and universal Google Search fallback.
   - Explain: *"We use structured keyword queries and universal search engine fallback, avoiding broken, hardcoded URL slugs."*
4. **Transparent Methodology (`/method`):**
   - Conclude by showing the public `/method` route: all weights, radii, formulas, and limitations are exported dynamically from `engine.method()`—never hardcoded marketing copy.

---

## Key Takeaway for Judges

> **"Locus proves that honest, user-first software can be built on $0 infrastructure. We do not hide uncertainty behind fabricated AI summaries or opaque single-number ratings. We measure what we can, label what we estimate, and let the user make an informed decision."**
