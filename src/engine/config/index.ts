/**
 * Locus Engine — Configuration & Tunable Constants
 *
 * All constants in this file carry an explicit provenance annotation:
 * - VERIFIED: Directly established by network probes and service specifications.
 * - SOURCED(<where>): Derived from an external documented reference.
 * - HEURISTIC: Engineering estimate or design choice.
 */

// Candidate Localities Selection
export const DEFAULT_CANDIDATE_LIMIT = 12; // HEURISTIC: manageable candidate set for user comparison

// Overpass Mirrors Pool (VERIFIED: Roland Olbricht Germany cluster with CORS *)
export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api",
  "https://z.overpass-api.de/api",
  "https://lz4.overpass-api.de/api"
];

// Geocoding Service Endpoints (VERIFIED: active with open CORS *)
export const PHOTON_BASE_URL = "https://photon.komoot.io/api";
export const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Multi-Modal Routing Base Endpoints (VERIFIED: routing.openstreetmap.de supports car, bike, foot with CORS *)
export const OSRM_ROUTED_HOSTS = {
  car: "https://routing.openstreetmap.de/routed-car",
  bike: "https://routing.openstreetmap.de/routed-bike",
  foot: "https://routing.openstreetmap.de/routed-foot"
};

// Fallback Demo OSRM Host (VERIFIED: supports car/driving only, ignores bike/foot)
export const OSRM_DEMO_HOST = "https://router.project-osrm.org";

// Rate Limiting Parameters (VERIFIED: based on observed provider slot limits)
export const OVERPASS_MIN_SPACING_MS = 750; // HEURISTIC: polite spacing to prevent 429
export const OVERPASS_CONCURRENCY = 1;     // VERIFIED: Overpass allows 2-4 slots per IP

export const NOMINATIM_MIN_SPACING_MS = 1100; // SOURCED(OSM Policy): strictly 1 request per second
export const NOMINATIM_CONCURRENCY = 1;

export const OSRM_MIN_SPACING_MS = 200; // HEURISTIC: fast routing response (~150ms table)
export const OSRM_CONCURRENCY = 2;

// Cache TTL Standards
export const CACHE_TTL_GEOCODING_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (cities/relations rarely change)
export const CACHE_TTL_LOCALITIES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const CACHE_TTL_AMENITIES_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
export const CACHE_TTL_ROUTING_MS = 24 * 60 * 60 * 1000;       // 24 hours

// Scoring Prior Weights (HEURISTIC: sum = 100)
export const BASE_WEIGHTS = {
  budget: 28,
  commute: 27,
  safety: 18,
  amenities: 12,
  transit: 8,
  household: 7
};

// Confidence Adjustment Multipliers (HEURISTIC)
export const CONFIDENCE_FACTORS = {
  high: 1.0,
  medium: 0.7,
  low: 0.35,
  none: 0.0
};

// Query Radii in Meters (HEURISTIC: verified design standard)
export const QUERY_RADII = {
  grocery: 800,
  food: 800,
  busStop: 500,
  busStops: 500,
  healthcare: 1500,
  education: 1500,
  leisure: 1500,
  railStation: 1500,
  railStations: 1500,
  safetyInfrastructure: 1500
};

// Congestion Multiplier α_city Tiers (HEURISTIC)
export const CITY_TIER_ALPHAS: Record<string, number> = {
  "bengaluru": 2.3,
  "bangalore": 2.3,
  "mumbai": 2.3,
  "delhi": 2.3,
  "new delhi": 2.3,
  "kolkata": 1.9,
  "chennai": 1.9,
  "hyderabad": 1.9,
  "pune": 1.6,
  "ahmedabad": 1.6,
  "default": 1.2
};
