/**
 * Locus Engine — Live Engine Implementation
 *
 * Implements the full public Engine interface using real live external providers:
 * - Photon for typeahead geocoding
 * - Nominatim for on-submit city resolution
 * - Overpass API with queue limits for localities and amenity counts
 * - OSRM multi-modal routing with peak congestion heuristic
 * - Continuous budget scoring and tier-band rent estimates
 * - Persistence and re-hydration via IndexedDB / StorageAdapter
 */

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
  SearchState
} from "../domain/types";
import {
  BASE_WEIGHTS,
  CONFIDENCE_FACTORS,
  OSRM_CONCURRENCY,
  OSRM_MIN_SPACING_MS,
  OVERPASS_CONCURRENCY,
  OVERPASS_MIN_SPACING_MS,
  QUERY_RADII
} from "../config";
import { IndexedDBStorageAdapter, type StorageAdapter } from "../infra/storage";
import { ResponseCache } from "../infra/cache";
import { RateLimitQueue } from "../infra/queue";
import { HttpClient } from "../infra/httpClient";
import { PhotonGeocodingProvider } from "../providers/geocoding/photon";
import { NominatimGeocodingProvider } from "../providers/geocoding/nominatim";
import { OverpassLocalityProvider } from "../providers/localities/overpass";
import { OverpassAmenityProvider } from "../providers/amenities/overpass";
import { OsrmRoutingProvider } from "../providers/routing/osrm";
import { DefaultRentProvider, type RentProvider } from "../providers/rent";
import { SearchPipeline } from "../pipeline/searchPipeline";
import { scoreArea } from "../scoring/matchScore";
import { computeSafetyIndicator } from "../scoring/safety";
import { computeHouseholdFit } from "../scoring/household";

export class LiveEngine implements Engine {
  private storage: StorageAdapter;
  private cache: ResponseCache;
  private httpClient: HttpClient;

  private photonProvider: PhotonGeocodingProvider;
  private nominatimProvider: NominatimGeocodingProvider;
  private localityProvider: OverpassLocalityProvider;
  private amenityProvider: OverpassAmenityProvider;
  private routingProvider: OsrmRoutingProvider;
  private rentProvider: RentProvider;

  private pipeline: SearchPipeline;
  private activeSearchAbortController: AbortController | null = null;

  private areaDetailsCache: Map<AreaId, AreaDetail> = new Map();
  private lastSearchPreferences: Preferences | null = null;

  private savedAreas: Set<AreaId> = new Set();
  private savedSubscribers: Set<() => void> = new Set();

  constructor(opts?: EngineOptions & { storage?: StorageAdapter }) {
    this.storage = opts?.storage || new IndexedDBStorageAdapter();
    this.cache = new ResponseCache({ storage: this.storage });
    this.httpClient = new HttpClient({ cache: this.cache });

    const overpassQueue = new RateLimitQueue({
      concurrency: OVERPASS_CONCURRENCY,
      minSpacingMs: OVERPASS_MIN_SPACING_MS
    });

    const osrmQueue = new RateLimitQueue({
      concurrency: OSRM_CONCURRENCY,
      minSpacingMs: OSRM_MIN_SPACING_MS
    });

    this.photonProvider = new PhotonGeocodingProvider(this.httpClient);
    this.nominatimProvider = new NominatimGeocodingProvider(this.httpClient, opts?.geoContact);
    this.localityProvider = new OverpassLocalityProvider(this.httpClient, overpassQueue);
    this.amenityProvider = new OverpassAmenityProvider(this.httpClient, overpassQueue);
    this.routingProvider = new OsrmRoutingProvider(this.httpClient, osrmQueue);
    this.rentProvider = new DefaultRentProvider();

    this.pipeline = new SearchPipeline({
      geocoding: this.nominatimProvider,
      localities: this.localityProvider,
      routing: this.routingProvider,
      amenities: this.amenityProvider,
      rent: this.rentProvider
    });

    this.loadSavedFromStorage();
  }

  public getScenario(): MockScenario {
    return "normal";
  }

  public setScenario(_s: MockScenario): void {
    void _s;
    // No-op in live engine
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
      // Storage unavailable or blocked
    }
  }

  private persistSaved(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          "locus_saved_areas",
          JSON.stringify(Array.from(this.savedAreas))
        );
      }
    } catch {
      // Storage unavailable or blocked
    }
    for (const sub of this.savedSubscribers) {
      sub();
    }
  }

  async suggestPlaces(
    query: string,
    hint?: { city?: string },
    signal?: AbortSignal
  ): Promise<PlaceSuggestion[]> {
    return this.photonProvider.suggest(query, hint, signal);
  }

  startSearch(prefs: Preferences): SearchHandle {
    // 1. Abort previous search if still active
    if (this.activeSearchAbortController) {
      this.activeSearchAbortController.abort();
    }

    const abortController = new AbortController();
    this.activeSearchAbortController = abortController;
    this.lastSearchPreferences = prefs;

    const searchId = `search-${Date.now()}`;
    const subscribers = new Set<(s: SearchState) => void>();

    let currentState: SearchState = {
      id: searchId,
      stage: "resolving-city",
      progress: 0,
      statusMessage: "Starting search...",
      areas: [],
      totalCandidates: 0,
      errors: [],
      localityErrors: {},
      isComplete: false
    };

    const notify = (state: SearchState) => {
      currentState = state;
      for (const cb of subscribers) {
        cb(state);
      }
    };

    // Execute pipeline asynchronously
    this.pipeline
      .execute(searchId, prefs, abortController.signal, notify)
      .then((result) => {
        // Cache details in memory and storage for deep-linking
        for (const [id, detail] of result.details) {
          this.areaDetailsCache.set(id, detail);
          this.storage.set(`locus_area_${id}`, detail, 24 * 60 * 60 * 1000).catch(() => {});
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          notify({
            id: searchId,
            stage: "error",
            progress: 0,
            statusMessage: `Search failure: ${err instanceof Error ? err.message : String(err)}`,
            areas: [],
            totalCandidates: 0,
            errors: [err instanceof Error ? err.message : String(err)],
            localityErrors: {},
            isComplete: true
          });
        }
      });

    return {
      id: searchId,
      getState: () => currentState,
      subscribe: (cb: (s: SearchState) => void): (() => void) => {
        subscribers.add(cb);
        cb(currentState); // Immediate state callback
        return () => {
          subscribers.delete(cb);
        };
      },
      cancel: () => {
        abortController.abort();
        notify({
          ...currentState,
          stage: "idle",
          statusMessage: "Search cancelled by user",
          isComplete: true
        });
      }
    };
  }

  async getArea(id: AreaId): Promise<AreaDetail | null> {
    // 1. Check in-memory detail cache
    const mem = this.areaDetailsCache.get(id);
    if (mem) {
      return mem;
    }

    // 2. Check storage adapter (re-hydration across reloads)
    try {
      const stored = await this.storage.get<AreaDetail>(`locus_area_${id}`);
      if (stored) {
        this.areaDetailsCache.set(id, stored);
        return stored;
      }
    } catch {
      // Storage unavailable
    }

    return null;
  }

  async setRentOverride(id: AreaId, rent: number | null): Promise<AreaDetail | null> {
    if (rent === null || rent <= 0) {
      this.rentProvider.clearUserOverride(id);
    } else {
      this.rentProvider.setUserOverride(id, rent);
    }

    const area = await this.getArea(id);
    if (!area) return null;

    const userRent = this.rentProvider.getUserOverride(id);
    const updatedRentBand = userRent !== undefined
      ? {
          value: { low: userRent, high: userRent },
          source: "user" as const,
          confidence: "high" as const,
          note: "user-entered known rent"
        }
      : area.rentBand;

    // Recompute score if preferences exist
    let updatedScore = area.matchScore;
    let updatedCompleteness = area.dataCompleteness;
    let updatedBreakdown = area.scoreBreakdown;
    let updatedExplanation = area.explanation;
    let updatedKeyFacts = area.keyFacts;

    if (this.lastSearchPreferences) {
      const primaryCommute = area.commutes.find(
        (c) => c.destinationId === this.lastSearchPreferences?.workplace.id
      ) ?? area.commutes[0];

      // Convert area amenities back to normalized category score format
      const normalizedMap = new Map();
      normalizedMap.set(id, {
        categoryScores: {
          healthcare: area.amenities.healthcare,
          education: area.amenities.education,
          grocery: area.amenities.grocery,
          food: area.amenities.food,
          leisure: area.amenities.leisure,
          busStops: area.amenities.busStops,
          railStations: area.amenities.railStations
        },
        amenitiesScore: area.amenitiesScore,
        transitAccessScore: area.amenities.busStops
      });

      const safetyIndicator = computeSafetyIndicator(area.safetyDetails);
      const householdFit = computeHouseholdFit(
        this.lastSearchPreferences.householdType,
        normalizedMap.get(id)
      );

      const res = scoreArea({
        areaName: area.name,
        preferences: this.lastSearchPreferences,
        effectiveCommute: area.effectiveCommuteMin,
        rentBand: updatedRentBand,
        safetyIndicator,
        amenitiesScore: area.amenitiesScore,
        transitAccessScore: area.amenities.busStops,
        householdFit,
        exceedsMaxCommute: primaryCommute?.exceedsMax ?? false
      });

      updatedScore = res.matchScore;
      updatedCompleteness = res.dataCompleteness;
      updatedBreakdown = res.scoreBreakdown;
      updatedExplanation = res.explanation;
      updatedKeyFacts = res.keyFacts;
    }

    const updatedDetail: AreaDetail = {
      ...area,
      matchScore: updatedScore,
      dataCompleteness: updatedCompleteness,
      scoreBreakdown: updatedBreakdown,
      explanation: updatedExplanation,
      keyFacts: updatedKeyFacts,
      userRentOverride: userRent,
      rentBand: updatedRentBand
    };

    this.areaDetailsCache.set(id, updatedDetail);
    await this.storage.set(`locus_area_${id}`, updatedDetail, 24 * 60 * 60 * 1000).catch(() => {});
    return updatedDetail;
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
        winnerId: details.length
          ? [...details].sort((a, b) => b.matchScore - a.matchScore)[0]?.id
          : undefined
      },
      {
        metric: "commute",
        label: "Peak Commute",
        values: Object.fromEntries(
          details.map((d) => [
            d.id,
            {
              value: d.effectiveCommuteMin.value !== null ? `${d.effectiveCommuteMin.value} min` : "Unavailable",
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
                : d.rentBand.value !== null
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
        url: `https://housing.com/rent/flats-for-rent-in-${areaName.toLowerCase()}`,
        isFallback: false
      },
      {
        portal: "99acres",
        url: `https://www.99acres.com/rent-property-in-${areaName.toLowerCase()}-ffid`,
        isFallback: false
      },
      {
        portal: "MagicBricks",
        url: `https://www.magicbricks.com/property-for-rent/residential-real-estate?keyword=${areaName}`,
        isFallback: false
      },
      {
        portal: "Web Search",
        url: `https://www.google.com/search?q=${encodeURIComponent(`flats for rent in ${area.name}`)}`,
        isFallback: true,
        note: "Universal fallback query link"
      }
    ];
  }

  method(): MethodInfo {
    return {
      weights: {
        budget: BASE_WEIGHTS.budget,
        commute: BASE_WEIGHTS.commute,
        safety: BASE_WEIGHTS.safety,
        amenities: BASE_WEIGHTS.amenities,
        transit: BASE_WEIGHTS.transit,
        household: BASE_WEIGHTS.household
      },
      confidenceFactors: CONFIDENCE_FACTORS,
      radii: QUERY_RADII,
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
