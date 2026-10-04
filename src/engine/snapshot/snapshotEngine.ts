/**
 * Locus Engine — Snapshot Engine (Demo Resilience)
 *
 * Implements the public Engine interface using pre-recorded authentic data
 * captured with verified `fetchedAt` timestamps from live Overpass, Nominatim, and OSRM runs.
 * Designed for 100% resilience on stage or in low-connectivity demo environments.
 */

import type {
  AreaDetail,
  AreaId,
  AreaSummary,
  ComparisonResult,
  Engine,
  EngineOptions,
  MethodInfo,
  MockScenario,
  PlaceSuggestion,
  PortalLink,
  Preferences,
  SearchHandle,
  SearchStage,
  SearchState
} from "../domain/types";
import { BASE_WEIGHTS, CONFIDENCE_FACTORS, QUERY_RADII } from "../config";
import { compareAreas } from "../features/compare";
import { buildPortalLinks } from "../features/portals";
import { SavedStore } from "../features/saved";
import { scoreArea } from "../scoring/matchScore";
import { computeBudgetUtility } from "../scoring/budget";

import puneRaw from "../../../fixtures/snapshots/pune.json";
import bengaluruRaw from "../../../fixtures/snapshots/bengaluru.json";
import delhiRaw from "../../../fixtures/snapshots/delhi.json";

interface SnapshotCityData {
  city: string;
  fetchedAt: string;
  provenanceNote: string;
  suggestions: PlaceSuggestion[];
  areas: AreaDetail[];
}

const SNAPSHOTS: Record<string, SnapshotCityData> = {
  pune: puneRaw as unknown as SnapshotCityData,
  bengaluru: bengaluruRaw as unknown as SnapshotCityData,
  bangalore: bengaluruRaw as unknown as SnapshotCityData,
  delhi: delhiRaw as unknown as SnapshotCityData
};

function toAreaSummary(area: AreaDetail): AreaSummary {
  return {
    id: area.id,
    rank: area.rank,
    name: area.name,
    matchScore: area.matchScore,
    confidence: area.confidence,
    keyFacts: area.keyFacts,
    explanation: area.explanation,
    effectiveCommuteMin: area.effectiveCommuteMin,
    rentBand: area.rentBand,
    safetyIndicator: area.safetyIndicator,
    amenitiesScore: area.amenitiesScore,
    lat: area.lat,
    lon: area.lon,
    dataCompleteness: area.dataCompleteness
  };
}

export class SnapshotEngine implements Engine {
  private activeScenario: MockScenario = "normal";
  private areasById = new Map<AreaId, AreaDetail>();
  private defaultCity = "pune";
  public saved = new SavedStore();

  constructor(opts?: EngineOptions) {
    if (opts?.scenario) {
      this.activeScenario = opts.scenario;
    }
    if (opts?.snapshotCity) {
      this.defaultCity = opts.snapshotCity.toLowerCase();
    }
    for (const snap of Object.values(SNAPSHOTS)) {
      for (const area of snap.areas) {
        this.areasById.set(area.id, { ...area });
      }
    }
  }

  public getScenario(): MockScenario {
    return this.activeScenario;
  }

  public setScenario(scenario: MockScenario): void {
    this.activeScenario = scenario;
  }

  public async suggestPlaces(
    query: string,
    _hint?: { city?: string },
    _signal?: AbortSignal
  ): Promise<PlaceSuggestion[]> {
    void _hint;
    void _signal;
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const allSuggestions: PlaceSuggestion[] = [
      ...puneRaw.suggestions,
      ...bengaluruRaw.suggestions,
      ...delhiRaw.suggestions
    ] as unknown as PlaceSuggestion[];

    const matched = allSuggestions.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.district?.toLowerCase().includes(q)
    );

    return matched;
  }

  public startSearch(prefs: Preferences): SearchHandle {
    const searchId = `snapshot_search_${Date.now()}`;
    const cityName = (prefs.city || this.defaultCity).toLowerCase();
    let selectedSnap = SNAPSHOTS.pune;

    if (cityName.includes("bengaluru") || cityName.includes("bangalore")) {
      selectedSnap = SNAPSHOTS.bengaluru;
    } else if (cityName.includes("delhi")) {
      selectedSnap = SNAPSHOTS.delhi;
    } else if (cityName.includes("pune")) {
      selectedSnap = SNAPSHOTS.pune;
    }

    const listeners = new Set<(s: SearchState) => void>();
    let cancelled = false;

    let currentState: SearchState = {
      id: searchId,
      stage: "resolving-city",
      progress: 10,
      statusMessage: `Resolving ${selectedSnap.city} boundary relation [Demo Snapshot]...`,
      areas: [],
      totalCandidates: selectedSnap.areas.length,
      errors: [],
      isComplete: false
    };

    const emit = (patch: Partial<SearchState>) => {
      currentState = { ...currentState, ...patch };
      for (const cb of listeners) {
        cb(currentState);
      }
    };

    const runStages = async () => {
      const stages: Array<{ stage: SearchStage; progress: number; message: string; delay: number }> = [
        { stage: "resolving-city", progress: 20, message: `Resolved ${selectedSnap.city} (fetched ${selectedSnap.fetchedAt.slice(0, 10)})`, delay: 50 },
        { stage: "discovering-localities", progress: 40, message: `Discovered ${selectedSnap.areas.length} candidate localities from recorded Overpass fixture`, delay: 75 },
        { stage: "routing", progress: 60, message: "Applied pre-computed OSRM road durations and alpha peak heuristic", delay: 75 },
        { stage: "profiling-amenities", progress: 80, message: "Profiled amenity and safety infrastructure counts", delay: 75 },
        { stage: "scoring", progress: 95, message: "Calculated multi-criteria utility and rent alignment", delay: 50 },
        { stage: "done", progress: 100, message: `Ranked ${selectedSnap.areas.length} localities for ${selectedSnap.city} [Snapshot Mode]`, delay: 25 }
      ];

      for (const st of stages) {
        if (cancelled) return;
        await new Promise((resolve) => setTimeout(resolve, st.delay));
        if (cancelled) return;

        if (st.stage === "done") {
          emit({
            stage: "done",
            progress: 100,
            statusMessage: st.message,
            areas: selectedSnap.areas.map(toAreaSummary),
            isComplete: true
          });
        } else {
          emit({
            stage: st.stage,
            progress: st.progress,
            statusMessage: st.message
          });
        }
      }
    };

    void runStages();

    return {
      id: searchId,
      getState: () => currentState,
      subscribe: (cb) => {
        listeners.add(cb);
        cb(currentState);
        return () => {
          listeners.delete(cb);
        };
      },
      cancel: () => {
        cancelled = true;
        emit({
          stage: "idle",
          statusMessage: "Search cancelled by user",
          isComplete: true
        });
      }
    };
  }

  public async getArea(id: AreaId): Promise<AreaDetail | null> {
    const found = this.areasById.get(id);
    return found ? { ...found } : null;
  }

  public async setRentOverride(id: AreaId, rent: number | null): Promise<AreaDetail | null> {
    const area = this.areasById.get(id);
    if (!area) return null;

    if (rent === null || rent <= 0) {
      return { ...area };
    }

    const updatedRentBand = {
      value: { low: rent, high: rent },
      source: "user" as const,
      confidence: "high" as const,
      note: "User-entered verified rent override"
    };

    const targetBudget = 30000;
    const budgetUtil = computeBudgetUtility(rent, targetBudget);
    const updatedBreakdown = area.scoreBreakdown.map((row) => {
      if (row.name === "budget") {
        return {
          ...row,
          points: Math.round(budgetUtil * row.maxPoints),
          raw: {
            value: rent,
            source: "user" as const,
            confidence: "high" as const,
            note: "User-entered known rent"
          }
        };
      }
      return row;
    });

    const primaryCommute = area.commutes[0];
    const scored = scoreArea({
      areaName: area.name,
      preferences: {
        city: "Pune",
        workplace: { id: "wp", label: "Workplace", name: "Workplace", lat: area.lat, lon: area.lon },
        destinations: [],
        transportMode: "car",
        maxCommuteMin: 45,
        budgetMax: targetBudget,
        householdType: "balanced"
      },
      effectiveCommute: area.effectiveCommuteMin,
      rentBand: updatedRentBand,
      safetyIndicator: area.safetyIndicator,
      amenitiesScore: area.amenitiesScore,
      transitAccessScore: area.amenities.busStops,
      householdFit: { value: 8.0, source: "heuristic", confidence: "high" },
      exceedsMaxCommute: primaryCommute?.exceedsMax ?? false
    });

    const updatedDetail: AreaDetail = {
      ...area,
      matchScore: scored.matchScore,
      dataCompleteness: scored.dataCompleteness,
      scoreBreakdown: updatedBreakdown,
      userRentOverride: rent,
      rentBand: updatedRentBand
    };

    this.areasById.set(id, updatedDetail);
    return { ...updatedDetail };
  }

  public async compare(ids: AreaId[]): Promise<ComparisonResult> {
    const areas: AreaDetail[] = [];
    for (const id of ids) {
      const a = await this.getArea(id);
      if (a) areas.push(a);
    }
    return compareAreas(areas);
  }

  public portals(area: AreaSummary): PortalLink[] {
    return buildPortalLinks(area.name);
  }

  public method(): MethodInfo {
    return {
      weights: BASE_WEIGHTS,
      confidenceFactors: CONFIDENCE_FACTORS,
      radii: QUERY_RADII,
      routingProfiles: {
        car: { available: true, provider: "OSRM routing.openstreetmap.de (Snapshot)", isHeuristic: false },
        bike: { available: true, provider: "OSRM routing.openstreetmap.de (Snapshot)", isHeuristic: false },
        walk: { available: true, provider: "OSRM routing.openstreetmap.de (Snapshot)", isHeuristic: false },
        transit: {
          available: false,
          provider: "None",
          isHeuristic: false
        }
      },
      limitations: [
        "Snapshot demo mode: Serves pre-recorded authentic Overpass and OSRM responses captured with verified fetchedAt timestamps.",
        "Commute timings reflect uncongested OSRM routing scaled by the empirical alpha congestion heuristic.",
        "Transit schedule routing is unverified and disabled in v1; public transit GTFS unavailable.",
        "Rent bands are tier-based baseline ranges; users can override with known rents for instant rescoring.",
        "Safety indicators represent physical OSM street lighting and police posts, not police crime data."
      ]
    };
  }

  public prefsToQuery(p: Preferences): string {
    const params = new URLSearchParams();
    params.set("city", p.city);
    params.set("wpName", p.workplace.name);
    params.set("wpLat", String(p.workplace.lat));
    params.set("wpLon", String(p.workplace.lon));
    params.set("mode", p.transportMode);
    params.set("maxCommute", String(p.maxCommuteMin));
    params.set("budgetMax", String(p.budgetMax));
    if (p.budgetMin !== undefined) params.set("budgetMin", String(p.budgetMin));
    params.set("household", p.householdType);
    if (p.priorityFocus) params.set("priority", p.priorityFocus);
    if (p.destinations.length > 0) {
      params.set("dests", JSON.stringify(p.destinations));
    }
    return params.toString();
  }

  public queryToPrefs(q: string): Preferences | null {
    try {
      const params = new URLSearchParams(q.startsWith("?") ? q.slice(1) : q);
      const city = params.get("city");
      const wpName = params.get("wpName");
      const wpLat = params.get("wpLat");
      const wpLon = params.get("wpLon");
      const mode = (params.get("mode") || "car") as Preferences["transportMode"];
      const maxCommute = Number(params.get("maxCommute")) || 45;
      const budgetMax = Number(params.get("budgetMax")) || 50000;
      const budgetMin = params.has("budgetMin") ? Number(params.get("budgetMin")) : undefined;
      const household = (params.get("household") || "balanced") as Preferences["householdType"];
      const priority = params.get("priority") as Preferences["priorityFocus"] | undefined;

      if (!city || !wpName || !wpLat || !wpLon) {
        return null;
      }

      let destinations: Preferences["destinations"] = [];
      const destsRaw = params.get("dests");
      if (destsRaw) {
        destinations = JSON.parse(destsRaw);
      }

      return {
        city,
        workplace: {
          id: "workplace",
          label: "Workplace",
          name: wpName,
          lat: Number(wpLat),
          lon: Number(wpLon)
        },
        destinations,
        transportMode: mode,
        maxCommuteMin: maxCommute,
        budgetMin,
        budgetMax,
        householdType: household,
        priorityFocus: priority
      };
    } catch {
      return null;
    }
  }
}
