# Locus — Data Provenance & Methodology Register

This document tracks every numeric metric and qualitative indicator produced by Locus, detailing its source, acquisition method, known limits, and confidence assignment rules.

## Core Rules

1. **No Invented Numbers:** If an external service is unavailable or data is absent, the value is strictly `null` with `source: "unavailable"` and a documented `note`.
2. **Explicit Confidence:** Every metric is wrapped in `Measured<T>` with a confidence rating:
   - `high`: Directly measured from authoritative, dense, verified data.
   - `medium`: Directly measured from uncalibrated or partially dense data.
   - `low`: Heuristically derived, estimated, or based on sparse tags.
   - `none`: Unverified or fallback approximation.

---

## Metric Register

| Metric | Source Tag | Method / Formula | Confidence Rule | Fallback & Missing Value Handling |
| :--- | :--- | :--- | :--- | :--- |
| **Locality Coordinates** | `osm` | Centroid of OSM relation/way or node coordinates | `high` if relation/way boundary exists; `medium` if single node | `null` if unnamed or unresolvable |
| **Amenity Counts** | `osm` | Overpass NWR count within specified radius (e.g. 800m daily, 1500m regional) | `high` if local OSM density high; `low` if overall area tag count < threshold | `null` on network or query failure; real `0` if queried and empty |
| **Free-flow Commute** | `routing` | OSRM route / table duration | `medium` (ignores peak traffic) | `null` if unreachable by road network |
| **Peak Commute Estimate** | `heuristic` | $T_{freeflow} \times (1 + \alpha_{city} (1 - \exp(-d/8)))$ | `low` (clearly labelled heuristic range) | `null` if base route is `null` |
| **Transit Access** | `osm` / `heuristic` | Proximity to verified rail/metro stations (< 1.5 km) | `low` | `null` with "no transit access nearby" |
| **Rent Band** | `heuristic` or `user` | Scaled starter tier table or direct user input | `high` if user-entered; `low` if tier band estimate | Range `{low, high}` with note "estimated band, not listing data" |
| **Safety Infrastructure** | `osm` | Tag count of lit roads, police stations, surveillance nodes | `low` if sparse; `medium` if dense | `null` if local coverage too thin ("insufficient OSM safety tags") |
| **Match Score** | `heuristic` | Normalized weighted utility over available criteria (0–100) | Proportional to `dataCompleteness` | Renormalized only over non-null inputs |
| **Data Completeness** | `heuristic` | Share of base criteria weight backed by non-null data | `high` | Computed deterministically |

---

## Radius Standards

- **Daily Needs (Grocery, Cafes, Pharmacies):** 800 meters.
- **Institutions (Schools, Hospitals, Parks):** 1,500 meters.
- **Transit (Metro, Suburban Rail):** 1,500 meters; **Bus:** 500 meters.
- **Safety Infrastructure (Police, Lit streets):** 1,500 meters.

*Note: The radius queried in Overpass must strictly equal the radius reported in the UI.*

---

## 4. Geocoding & Locality Discovery Provenance

1. **Place Typeahead Suggestions (`suggestPlaces`):**
   - Source: OpenStreetMap data indexed via Komoot Photon API.
   - Geometry: GeoJSON point coordinates converted directly to `{lat, lon}`.
   - Stable IDs: Prefixed with OSM entity type: `node/<id>`, `way/<id>`, `relation/<id>`.
2. **City Resolution:**
   - Source: OSM Nominatim forward search.
   - Administrative boundary relation prioritized (`relationId`).
   - If resolved to node/way, exact geocoder bounding box `[south, north, west, east]` is used with zero padding.
3. **Locality Discovery:**
   - Source: Overpass API querying `nwr["place"~"^(suburb|neighbourhood|quarter)$"]`.
   - Node lat/lon or way/relation centroid `center.lat` / `center.lon` used directly.
   - Unnamed elements discarded.
   - Spatial deduplication eliminates records within 500m sharing normalized name.

---

## 5. Amenity & Safety Indicator Provenance

1. **Category Counting Methodology:**
   - Acquired via single-request Overpass QL with named sets (`.set out count;`).
   - Elements counted include `node`, `way`, and `relation` (`nwr`) to ensure schools, hospitals, and parks mapped as polygons are not undercounted.
   - Radii: 800m for grocery and food; 500m for bus stops; 1500m for healthcare, education, leisure, rail stations, and safety infrastructure.
2. **Confidence Rules:**
   - Evaluated based on total mapped objects across all categories:
     - $\ge 30$ objects: `confidence: "high"`.
     - $10$ to $29$ objects: `confidence: "medium"` (noted as "Moderate OpenStreetMap coverage").
     - $< 10$ objects: `confidence: "low"` (noted as "Sparse OpenStreetMap coverage in this locality").
3. **Safety Infrastructure Disclaimer:**
   - Sourced exclusively from OSM infrastructure tags: `amenity=police`, `way[lit=yes]`, `node[man_made=surveillance]`.
   - Explicitly labelled: `"infrastructure indicator, not crime data"`.
   - Confidence is lowered or `null` when local coverage is insufficient. Never derives safety from commercial amenities.

---

## 6. Commute & Multi-Modal Routing Provenance

1. **Free-Flow Duration (`freeFlowMin`):**
   - Source: `routing` (OSRM `/table` and `/route` endpoints).
   - Confidence: `medium` (uncongested base road network timing).
2. **Road Distance (`distanceKm`):**
   - Source: `routing` (OSRM route/table distance in meters converted to km).
   - Confidence: `high` (verified OSM street network graph distance).
3. **Peak Commute Estimate (`peakEstimateMin`):**
   - Source: `heuristic` ($T_{\text{peak}} = T_{\text{freeflow}} \times (1 + \alpha_{\text{city}} \times (1 - \exp(-d/8)))$).
   - Confidence: `low` (clearly labelled model estimate with confidence range).
   - Tier lookup derives $\alpha$ strictly from administrative geocoder tags.
4. **Transit Mode Commute:**
   - Source: `unavailable` (`null`).
   - Confidence: `none`.
   - Explicit note: `"Transit schedule routing is unverified in v1; public transit GTFS unavailable"`.

---

## 7. Rent & Cost Estimation Provenance

1. **City Tier Band Heuristic (`RentTierBand`):**
   - Source: `heuristic`.
   - Confidence: `low`.
   - Note: `"estimated band, not listing data"`.
   - Provenance Status: **UNVERIFIED starter heuristic table** (§4.4).
   - Starter Table:
     | Tier | Cities / Examples | Band Low (₹/mo) | Band High (₹/mo) |
     | :--- | :--- | :--- | :--- |
     | Tier 1 Prime | Mumbai, Delhi, Bengaluru | ₹22,000 | ₹120,000 |
     | Tier 1 Standard | Pune, Hyderabad, Chennai | ₹16,000 | ₹65,000 |
     | Tier 2 | Jaipur, Lucknow, Nagpur, Indore, Ahmedabad, Surat, Chandigarh | ₹9,000 | ₹32,000 |
     | Tier 3 | Rest of India | ₹5,000 | ₹18,000 |
   - Locality Scaling: Scaled continuously by candidate centrality / density rank ($r \in [0, 1]$) with a $\pm 20\%$ locality band width.
2. **User Rent Override:**
   - Source: `user`.
   - Confidence: `high`.
   - Note: `"user-entered known rent"`. Takes precedence over tier-band heuristic whenever provided by the user.

---

## 8. Multi-Criteria Scoring & Household Fit Provenance

1. **Criteria & Prior Weights (`BASE_WEIGHTS`):**
   - Prior Weights (sum = 100): Budget 28, Commute 27, Safety 18, Amenities 12, Transit 8, Household 7 (`HEURISTIC`).
   - Priority Focus: Multiplies chosen criterion base weight by 1.4 (`HEURISTIC`).
2. **Confidence Adjustment & Missing Data:**
   - Effective Weight: $\text{effectiveWeight} = \text{baseWeight} \times \text{confidenceFactor}$ (high 1.0, medium 0.7, low 0.35, none 0).
   - Renormalization: Strictly renormalizes over criteria with non-null values ($S_{eff} > 0$).
   - Data Completeness: Proportion of prior weight backed by non-null data ($\sum_{non-null} W_{base} / 100$).
   - Strict Zero vs Null: A real count of 0 is measured with non-zero weight; missing data is `null` with weight 0. Zero `|| 0` substitutions.
3. **Continuous Monotone Budget Utility:**
   - Evaluated at representative rent $R$:
     - $R_{\min} \le R \le R_t \rightarrow U = 1.0$
     - $R_t < R \le R_{\max} \rightarrow U = 1.0 - 0.3 \times (R - R_t) / (R_{\max} - R_t)$ (falls linearly from 1 to 0.7)
     - $R > R_{\max} \rightarrow U = 0.7 \times \exp(-4 \times (R - R_{\max}) / R_{\max})$
     - $R < R_{\min} \rightarrow U = \max(0.7, 1.0 - 0.3 \times (R_{\min} - R) / R_{\min})$
4. **Household Fit Personas:**
   - Derived deterministically from relative category scores:
     - Family: schools (40%), parks/leisure (30%), healthcare (30%).
     - Couple: dining (50%), leisure (50%).
     - Student: education (40%), transit (35%), dining (25%).
     - Balanced: equal 20% across all 5.



