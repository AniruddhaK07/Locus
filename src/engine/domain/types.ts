/**
 * Locus Engine — Domain Types & Interfaces
 *
 * Framework-agnostic types defining provenance, preferences, areas, scoring,
 * search handles, and the public engine contract.
 */

export type Source = "osm" | "routing" | "heuristic" | "user" | "fixture" | "unavailable";
export type Confidence = "high" | "medium" | "low" | "none";

export interface Measured<T> {
  value: T | null;          // null = not available (never a guessed default)
  source: Source;
  confidence: Confidence;
  note?: string;            // reason when null; method caveat otherwise
  fetchedAt?: string;       // ISO timestamp
}

export type AreaId = string; // Stable identifier format: "{osmType}/{osmId}", e.g. "node/12345"

export type TransportMode = "car" | "bike" | "walk" | "transit";
export type HouseholdType = "student" | "couple" | "family" | "balanced";

export interface Destination {
  id: string;
  label: string; // e.g. "Workplace", "Gym", "School"
  name: string;
  lat: number;
  lon: number;
}

export interface Preferences {
  city: string;
  workplace: Destination;
  destinations: Destination[]; // up to 3 extra
  transportMode: TransportMode;
  maxCommuteMin: number;
  budgetMin?: number;
  budgetMax: number;
  householdType: HouseholdType;
  priorityFocus?: "budget" | "commute" | "safety" | "amenities" | "transit";
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  city?: string;
  district?: string;
  state?: string;
  lat: number;
  lon: number;
  type: string;
}

export interface AmenityCounts {
  healthcare: Measured<number>;
  education: Measured<number>;
  grocery: Measured<number>;
  food: Measured<number>;
  leisure: Measured<number>;
  busStops: Measured<number>;
  railStations: Measured<number>;
}

export interface CommuteEstimate {
  destinationId: string;
  destinationLabel: string;
  freeFlowMin: Measured<number>;
  peakEstimateMin: Measured<number>;
  distanceKm: Measured<number>;
  mode: TransportMode;
  exceedsMax: boolean;
}

export interface ScoreCriterion {
  name: string; // "budget" | "commute" | "safety" | "amenities" | "transit" | "household"
  points: number;
  maxPoints: number;
  effectiveWeight: number;
  raw: Measured<unknown>;
}

export interface AreaSummary {
  id: AreaId;
  name: string;
  lat: number;
  lon: number;
  rank: number;
  matchScore: number; // 0–100
  confidence: Confidence;
  dataCompleteness: number; // 0–1 share of weights backed by real data
  explanation: string;
  keyFacts: string[]; // 3 key highlights
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

export type SearchStage =
  | "idle"
  | "resolving-city"
  | "discovering-localities"
  | "routing"
  | "profiling-amenities"
  | "scoring"
  | "done"
  | "error";

export interface SearchState {
  id: string;
  stage: SearchStage;
  progress: number; // 0–100
  statusMessage: string;
  areas: AreaSummary[];
  totalCandidates: number;
  errors: string[];
  localityErrors?: Record<AreaId, string>; // Per-locality failure map
  isComplete: boolean;
}

export interface SearchHandle {
  id: string;
  getState(): SearchState;
  subscribe(cb: (s: SearchState) => void): () => void;
  cancel(): void;
}

export interface ComparisonMetricRow {
  metric: string;
  label: string;
  values: Record<AreaId, Measured<string | number | { low: number; high: number }>>;
  winnerId?: AreaId;
}

export interface ComparisonResult {
  areas: AreaDetail[];
  rows: ComparisonMetricRow[];
}

export interface PortalLink {
  portal: string;
  url: string;
  isFallback: boolean;
  note?: string;
}

export interface MethodInfo {
  engineMode?: "live" | "mock" | "snapshot";
  weights: Record<string, number>;
  confidenceFactors: Record<Confidence, number>;
  radii: Record<string, number>;
  routingProfiles: Record<TransportMode, { available: boolean; provider: string; isHeuristic: boolean }>;
  limitations: string[];
}

export type MockScenario = "normal" | "slow" | "partial" | "empty" | "error" | "sparse-data";

export interface EngineOptions {
  mode: "live" | "mock" | "snapshot";
  scenario?: MockScenario;
  geoContact?: string;
  snapshotCity?: "Delhi" | "Bengaluru" | "Pune";
}

export interface Engine {
  readonly mode?: "live" | "mock" | "snapshot";
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
