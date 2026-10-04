import type {
  AreaDetail,
  AreaId,
  AreaSummary,
  ComparisonMetricRow,
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
import { MOCK_AREAS, MOCK_PLACES, MOCK_SPARSE_AREAS, toAreaSummary } from "./mockData";

export class MockEngine implements Engine {
  private scenario: MockScenario;
  private savedAreas: Set<AreaId> = new Set();
  private savedSubscribers: Set<() => void> = new Set();
  private rentOverrides: Map<AreaId, number> = new Map();
  private currentAreaDetails: Map<AreaId, AreaDetail> = new Map();

  constructor(opts?: EngineOptions) {
    this.scenario = opts?.scenario || "normal";
    this.loadInitialData();
    this.loadSavedFromStorage();
  }

  public setScenario(s: MockScenario): void {
    this.scenario = s;
  }

  public getScenario(): MockScenario {
    return this.scenario;
  }

  private loadInitialData(): void {
    for (const a of [...MOCK_AREAS, ...MOCK_SPARSE_AREAS]) {
      this.currentAreaDetails.set(a.id, { ...a });
    }
  }

  private loadSavedFromStorage(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem("locus_saved_areas");
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          for (const id of ids) {
            this.savedAreas.add(id);
          }
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  private persistSaved(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("locus_saved_areas", JSON.stringify(Array.from(this.savedAreas)));
      }
    } catch {
      // Storage unavailable or disabled
    }
    for (const sub of this.savedSubscribers) {
      sub();
    }
  }

  async suggestPlaces(query: string, hint?: { city?: string }): Promise<PlaceSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MOCK_PLACES.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchCity = p.city?.toLowerCase().includes(q) ?? false;
      const matchDistrict = p.district?.toLowerCase().includes(q) ?? false;
      if (hint?.city && p.city?.toLowerCase() !== hint.city.toLowerCase() && p.type !== "city") {
        return false;
      }
      return matchName || matchCity || matchDistrict;
    });
  }

  startSearch(prefs: Preferences): SearchHandle {
    const searchId = `search-${Date.now()}`;
    const scenario = this.scenario;

    let stage: SearchStage = "resolving-city";
    let progress = 10;
    let statusMessage = "Resolving city boundary and coordinate anchors...";
    let areas: AreaSummary[] = [];
    const errors: string[] = [];
    let isComplete = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const subscribers = new Set<(s: SearchState) => void>();

    const getState = (): SearchState => ({
      id: searchId,
      stage,
      progress,
      statusMessage,
      areas,
      totalCandidates: scenario === "empty" ? 0 : scenario === "sparse-data" ? MOCK_SPARSE_AREAS.length : MOCK_AREAS.length,
      errors,
      isComplete
    });

    const notify = () => {
      const s = getState();
      for (const sub of subscribers) {
        sub(s);
      }
    };

    const stepDelay = scenario === "slow" ? 600 : 70;

    // Orchestrate progression
    const runProgression = async () => {
      if (scenario === "error") {
        stage = "error";
        progress = 100;
        statusMessage = "Search failed.";
        errors.push("Failed to query OpenStreetMap locality discovery service. Connection timed out.");
        isComplete = true;
        notify();
        return;
      }

      // Stage 1: Resolving City
      await new Promise((r) => { timer = setTimeout(r, stepDelay); });
      if (cancelled) return;
      stage = "discovering-localities";
      progress = 25;
      statusMessage = `Querying localities in ${prefs.city || "city"}...`;
      notify();

      // Stage 2: Locality Discovery
      await new Promise((r) => { timer = setTimeout(r, stepDelay); });
      if (cancelled) return;

      if (scenario === "empty") {
        stage = "done";
        progress = 100;
        statusMessage = "No candidate localities matched the search criteria.";
        areas = [];
        isComplete = true;
        notify();
        return;
      }

      stage = "routing";
      progress = 50;
      statusMessage = `Calculating commute times for ${prefs.transportMode} transport...`;
      notify();

      // Stage 3: Routing
      await new Promise((r) => { timer = setTimeout(r, stepDelay); });
      if (cancelled) return;
      stage = "profiling-amenities";
      progress = 75;
      statusMessage = "Gathering amenity and infrastructure indicators...";

      if (scenario === "partial") {
        // Emit partial areas
        areas = MOCK_AREAS.slice(0, 3).map(toAreaSummary);
        errors.push("Overpass rate limit reached for 9 localities. Partial results shown.");
        notify();
        await new Promise((r) => { timer = setTimeout(r, stepDelay); });
        if (cancelled) return;
        stage = "done";
        progress = 100;
        statusMessage = "Search complete (partial data).";
        isComplete = true;
        notify();
        return;
      }

      notify();

      // Stage 4: Profiling Amenities & Scoring
      await new Promise((r) => { timer = setTimeout(r, stepDelay); });
      if (cancelled) return;
      stage = "scoring";
      progress = 90;
      statusMessage = "Computing honest match scores and data completeness...";
      notify();

      // Stage 5: Done
      await new Promise((r) => { timer = setTimeout(r, stepDelay); });
      if (cancelled) return;

      const sourceList = scenario === "sparse-data" ? MOCK_SPARSE_AREAS : MOCK_AREAS;
      areas = sourceList.map((a) => {
        const override = this.rentOverrides.get(a.id);
        const detail = this.currentAreaDetails.get(a.id) || a;
        if (override) {
          return toAreaSummary({ ...detail, userRentOverride: override });
        }
        return toAreaSummary(detail);
      });

      stage = "done";
      progress = 100;
      statusMessage = `Discovered and ranked ${areas.length} localities.`;
      isComplete = true;
      notify();
    };

    runProgression().catch((err) => {
      stage = "error";
      progress = 100;
      errors.push(String(err));
      isComplete = true;
      notify();
    });

    return {
      id: searchId,
      getState,
      subscribe: (cb) => {
        subscribers.add(cb);
        cb(getState());
        return () => subscribers.delete(cb);
      },
      cancel: () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      }
    };
  }

  async getArea(id: AreaId): Promise<AreaDetail | null> {
    const area = this.currentAreaDetails.get(id);
    if (!area) return null;
    const override = this.rentOverrides.get(id);
    return {
      ...area,
      userRentOverride: override
    };
  }

  async setRentOverride(id: AreaId, rent: number | null): Promise<AreaDetail | null> {
    if (rent === null || rent <= 0) {
      this.rentOverrides.delete(id);
    } else {
      this.rentOverrides.set(id, rent);
    }

    const area = this.currentAreaDetails.get(id);
    if (!area) return null;

    const override = this.rentOverrides.get(id);
    const updated: AreaDetail = {
      ...area,
      userRentOverride: override,
      rentBand: override
        ? {
            value: { low: override, high: override },
            source: "user",
            confidence: "high",
            note: "User-entered known rent for this locality"
          }
        : area.rentBand
    };
    this.currentAreaDetails.set(id, updated);
    return updated;
  }

  async compare(ids: AreaId[]): Promise<ComparisonResult> {
    const details: AreaDetail[] = [];
    for (const id of ids) {
      const a = await this.getArea(id);
      if (a) details.push(a);
    }

    const rows: ComparisonMetricRow[] = [
      {
        metric: "matchScore",
        label: "Match Score",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            { value: `${d.matchScore}/100`, source: "heuristic", confidence: d.confidence }
          ])
        ),
        winnerId: details.length ? [...details].sort((a, b) => b.matchScore - a.matchScore)[0]?.id : undefined
      },
      {
        metric: "commute",
        label: "Peak Commute",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            {
              value: d.effectiveCommuteMin.value ? `${d.effectiveCommuteMin.value} min` : "Unavailable",
              source: d.effectiveCommuteMin.source,
              confidence: d.effectiveCommuteMin.confidence,
              note: d.effectiveCommuteMin.note
            }
          ])
        ),
        winnerId: details.length
          ? [...details].sort(
              (a, b) => (a.effectiveCommuteMin.value ?? 999) - (b.effectiveCommuteMin.value ?? 999)
            )[0]?.id
          : undefined
      },
      {
        metric: "rent",
        label: "Rent Band (₹/mo)",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            {
              value: d.userRentOverride
                ? `₹${d.userRentOverride.toLocaleString("en-IN")} (user)`
                : d.rentBand.value
                ? `₹${d.rentBand.value.low.toLocaleString("en-IN")} - ₹${d.rentBand.value.high.toLocaleString("en-IN")}`
                : "Unavailable",
              source: d.userRentOverride ? "user" : d.rentBand.source,
              confidence: d.userRentOverride ? "high" : d.rentBand.confidence,
              note: d.rentBand.note
            }
          ])
        )
      },
      {
        metric: "amenities",
        label: "Amenities Rating",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            {
              value: d.amenitiesScore.value !== null ? `${d.amenitiesScore.value} / 10` : "Sparse",
              source: d.amenitiesScore.source,
              confidence: d.amenitiesScore.confidence,
              note: d.amenitiesScore.note
            }
          ])
        ),
        winnerId: details.length
          ? [...details].sort(
              (a, b) => (b.amenitiesScore.value ?? 0) - (a.amenitiesScore.value ?? 0)
            )[0]?.id
          : undefined
      },
      {
        metric: "safety",
        label: "Safety Infrastructure",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            {
              value: d.safetyIndicator.value !== null ? `${d.safetyIndicator.value} / 10` : "Sparse tags",
              source: d.safetyIndicator.source,
              confidence: d.safetyIndicator.confidence,
              note: d.safetyIndicator.note
            }
          ])
        ),
        winnerId: details.length
          ? [...details].sort(
              (a, b) => (b.safetyIndicator.value ?? 0) - (a.safetyIndicator.value ?? 0)
            )[0]?.id
          : undefined
      },
      {
        metric: "completeness",
        label: "Data Completeness",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            {
              value: `${Math.round(d.dataCompleteness * 100)}%`,
              source: "heuristic",
              confidence: "high"
            }
          ])
        )
      }
    ];

    return {
      areas: details,
      rows
    };
  }

  saved = {
    list: (): AreaId[] => Array.from(this.savedAreas),
    has: (id: AreaId): boolean => this.savedAreas.has(id),
    toggle: (id: AreaId): void => {
      if (this.savedAreas.has(id)) {
        this.savedAreas.delete(id);
      } else {
        this.savedAreas.add(id);
      }
      this.persistSaved();
    },
    subscribe: (cb: () => void): (() => void) => {
      this.savedSubscribers.add(cb);
      return () => this.savedSubscribers.delete(cb);
    }
  };

  portals(area: AreaSummary): PortalLink[] {
    const areaName = encodeURIComponent(area.name);
    return [
      {
        portal: "Housing.com",
        url: `https://housing.com/rent/flats-for-rent-in-${areaName.toLowerCase()}-bangalore`,
        isFallback: false
      },
      {
        portal: "99acres",
        url: `https://www.99acres.com/rent-property-in-${areaName.toLowerCase()}-bangalore-ffid`,
        isFallback: false
      },
      {
        portal: "MagicBricks",
        url: `https://www.magicbricks.com/property-for-rent/residential-real-estate?cityName=Bengaluru&keyword=${areaName}`,
        isFallback: false
      },
      {
        portal: "Web Search",
        url: `https://www.google.com/search?q=${encodeURIComponent(`flats for rent in ${area.name} Bengaluru`)}`,
        isFallback: true,
        note: "Universal fallback query link"
      }
    ];
  }

  method(): MethodInfo {
    return {
      weights: {
        budget: 28,
        commute: 27,
        safety: 18,
        amenities: 12,
        transit: 8,
        household: 7
      },
      confidenceFactors: {
        high: 1.0,
        medium: 0.7,
        low: 0.35,
        none: 0.0
      },
      radii: {
        grocery: 800,
        food: 800,
        busStop: 500,
        healthcare: 1500,
        education: 1500,
        leisure: 1500,
        railStation: 1500,
        safetyInfrastructure: 1500
      },
      routingProfiles: {
        car: { available: true, provider: "routing.openstreetmap.de (routed-car)", isHeuristic: false },
        bike: { available: true, provider: "routing.openstreetmap.de (routed-bike)", isHeuristic: false },
        walk: { available: true, provider: "routing.openstreetmap.de (routed-foot)", isHeuristic: false },
        transit: { available: false, provider: "None (disabled in v1)", isHeuristic: true }
      },
      limitations: [
        "Peak commute times are calculated via non-linear congestion heuristics since open-source live traffic APIs are unavailable.",
        "Rental prices are based on calibrated municipal tier-bands scaled by proximity and amenity density, not scraped commercial listings.",
        "Safety ratings measure OpenStreetMap infrastructure features (police stations, lit roadways, surveillance nodes) and are not police crime statistics.",
        "OSM data density varies by city and neighborhood; sparse data reduces criterion confidence and influences overall score."
      ]
    };
  }

  prefsToQuery(p: Preferences): string {
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

  queryToPrefs(q: string): Preferences | null {
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
