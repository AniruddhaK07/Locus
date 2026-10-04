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
