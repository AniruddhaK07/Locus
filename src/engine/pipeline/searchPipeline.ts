/**
 * Locus Engine — Search Pipeline Orchestrator
 *
 * Implements §4.6 progressive, abortable, resilient pipeline:
 * 1. resolving-city -> geocodes city to OSM administrative relation or bbox
 * 2. discovering-localities -> fetches candidates, dedups, ranks by workplace proximity
 * 3. routing -> batches commute matrix via OSRM table endpoints
 * 4. profiling-amenities -> queries category counts per locality with failure isolation
 * 5. scoring -> relative normalization, budget utility, safety indicator, household fit
 * 6. done -> ranked results with honest provenance and plain-English explanations
 */

import type {
  AreaDetail,
  AreaId,
  AreaSummary,
  CommuteEstimate,
  Destination,
  Measured,
  Preferences,
  SearchState
} from "../domain/types";
import { DEFAULT_CANDIDATE_LIMIT } from "../config";
import type { DiscoveredLocality } from "../providers/localities/types";
import type { NominatimGeocodingProvider } from "../providers/geocoding/nominatim";
import type { OverpassLocalityProvider } from "../providers/localities/overpass";
import type { OsrmRoutingProvider } from "../providers/routing/osrm";
import type { OverpassAmenityProvider } from "../providers/amenities/overpass";
import type { AmenityProfileResult } from "../providers/amenities/types";
import type { RentProvider } from "../providers/rent";
import { normalizeAmenityProfiles, type NormalizedLocalityScores } from "../scoring/amenityScores";
import { computeSafetyIndicator } from "../scoring/safety";
import { computeHouseholdFit } from "../scoring/household";
import { scoreArea } from "../scoring/matchScore";

export interface PipelineDependencies {
  geocoding: NominatimGeocodingProvider;
  localities: OverpassLocalityProvider;
  routing: OsrmRoutingProvider;
  amenities: OverpassAmenityProvider;
  rent: RentProvider;
}

export interface PipelineExecutionResult {
  areas: AreaSummary[];
  details: Map<AreaId, AreaDetail>;
}

export class SearchPipeline {
  constructor(private deps: PipelineDependencies) {}

  async execute(
    searchId: string,
    prefs: Preferences,
    signal: AbortSignal,
    onStateChange: (state: SearchState) => void
  ): Promise<PipelineExecutionResult> {
    const localityErrors: Record<AreaId, string> = {};
    const errors: string[] = [];

    const emit = (
      stage: SearchState["stage"],
      progress: number,
      statusMessage: string,
      areas: AreaSummary[] = [],
      isComplete: boolean = false
    ) => {
      onStateChange({
        id: searchId,
        stage,
        progress,
        statusMessage,
        areas,
        totalCandidates: areas.length,
        errors: [...errors],
        localityErrors: { ...localityErrors },
        isComplete
      });
    };

    // Stage 1: Resolving City
    emit("resolving-city", 10, `Resolving city '${prefs.city}'...`);

    if (signal.aborted) {
      emit("idle", 0, "Search cancelled", [], true);
      return { areas: [], details: new Map() };
    }

    let cityResolution;
    try {
      cityResolution = await this.deps.geocoding.resolveCity(prefs.city, signal);
    } catch (err) {
      if (signal.aborted) return { areas: [], details: new Map() };
      const msg = `City resolution failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      emit("error", 0, msg, [], true);
      return { areas: [], details: new Map() };
    }

    if (!cityResolution.relationId && !cityResolution.boundingBox) {
      const msg = `Could not resolve '${prefs.city}' to an administrative boundary or bounding box.`;
      errors.push(msg);
      emit("error", 0, msg, [], true);
      return { areas: [], details: new Map() };
    }

    // Stage 2: Discovering Localities
    emit(
      "discovering-localities",
      25,
      `Discovering candidate localities within ${cityResolution.name}...`
    );

    if (signal.aborted) {
      emit("idle", 0, "Search cancelled", [], true);
      return { areas: [], details: new Map() };
    }

    let candidates: DiscoveredLocality[] = [];
    try {
      const discoveryResult = await this.deps.localities.discoverLocalities(
        cityResolution,
        prefs.workplace,
        {
          limit: DEFAULT_CANDIDATE_LIMIT,
          maxCommuteMin: prefs.maxCommuteMin
        },
        signal
      );
      candidates = discoveryResult.localities;
    } catch (err) {
      if (signal.aborted) return { areas: [], details: new Map() };
      const msg = `Locality discovery failed: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      emit("error", 25, msg, [], true);
      return { areas: [], details: new Map() };
    }

    if (candidates.length === 0) {
      emit(
        "done",
        100,
        `No candidate localities discovered within ${cityResolution.name}.`,
        [],
        true
      );
      return { areas: [], details: new Map() };
    }

    // Stage 3: Multi-Modal Routing
    emit("routing", 40, `Calculating commutes for ${candidates.length} localities...`);

    if (signal.aborted) {
      emit("idle", 0, "Search cancelled", [], true);
      return { areas: [], details: new Map() };
    }

    const allDestinations: Destination[] = [prefs.workplace, ...prefs.destinations];

    // Map of AreaId -> CommuteEstimate[]
    const localityCommutes: Map<AreaId, CommuteEstimate[]> = new Map();
    const localityEffectiveCommutes: Map<AreaId, Measured<number>> = new Map();

    try {
      const commuteResults = await this.deps.routing.calculateCommutes(
        {
          origins: candidates.map((c) => ({ lat: c.lat, lon: c.lon })),
          destinations: allDestinations,
          mode: prefs.transportMode,
          cityName: cityResolution.name,
          maxCommuteMin: prefs.maxCommuteMin
        },
        signal
      );

      candidates.forEach((cand, idx) => {
        const cRes = commuteResults[idx];
        if (cRes) {
          localityCommutes.set(cand.id, cRes.commutes);
          localityEffectiveCommutes.set(cand.id, cRes.effectiveCommuteMin);
        }
      });
    } catch (err) {
      // Entire routing stage failure: record error and treat all commutes as null
      errors.push(`Routing batch error: ${err instanceof Error ? err.message : String(err)}`);
      for (const cand of candidates) {
        localityCommutes.set(cand.id, []);
        localityEffectiveCommutes.set(cand.id, {
          value: null,
          source: "unavailable",
          confidence: "none",
          note: "Routing service batch failure"
        });
      }
    }

    // Stage 4: Profiling Amenities
    emit("profiling-amenities", 50, "Profiling neighborhood amenities...");

    const rawAmenityProfiles: Map<AreaId, AmenityProfileResult> = new Map();

    for (let i = 0; i < candidates.length; i++) {
      if (signal.aborted) {
        emit("idle", 0, "Search cancelled", [], true);
        return { areas: [], details: new Map() };
      }

      const cand = candidates[i];
      try {
        const profile = await this.deps.amenities.getProfile(
          { lat: cand.lat, lon: cand.lon },
          signal
        );
        rawAmenityProfiles.set(cand.id, profile);
      } catch (err) {
        // Failure isolation: record locality error without crashing pipeline
        localityErrors[cand.id] = `Amenity profiling failed: ${
          err instanceof Error ? err.message : String(err)
        }`;

        rawAmenityProfiles.set(cand.id, {
          amenities: {
            healthcare: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" },
            education: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" },
            grocery: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" },
            food: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" },
            leisure: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" },
            busStops: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" },
            railStations: { value: null, source: "unavailable", confidence: "none", note: "Amenity query failed" }
          },
          safety: {
            policeCount: { value: null, source: "unavailable", confidence: "none", note: "Safety query failed" },
            litRoadsCount: { value: null, source: "unavailable", confidence: "none", note: "Safety query failed" },
            surveillanceCount: { value: null, source: "unavailable", confidence: "none", note: "Safety query failed" },
            coverageNote: "Query failed"
          },
          totalMappedObjects: 0
        });
      }

      const curProgress = 50 + Math.round(((i + 1) / candidates.length) * 35); // 50% -> 85%
      emit(
        "profiling-amenities",
        curProgress,
        `Profiling amenities (${i + 1}/${candidates.length}): ${cand.name}...`
      );
    }

    // Stage 5: Multi-Criteria Scoring & Normalization
    emit("scoring", 90, "Normalizing scores and generating explanations...");

    if (signal.aborted) {
      emit("idle", 0, "Search cancelled", [], true);
      return { areas: [], details: new Map() };
    }

    // Prepare amenity counts for relative normalization
    const amenityCountsList = candidates.map((c) => rawAmenityProfiles.get(c.id)!.amenities);
    const normalizedScoresList: NormalizedLocalityScores[] = normalizeAmenityProfiles(amenityCountsList);

    const preliminarySummaries: AreaSummary[] = [];
    const detailsMap: Map<AreaId, AreaDetail> = new Map();

    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      const rawProfile = rawAmenityProfiles.get(cand.id)!;
      const normalizedScores = normalizedScoresList[i];
      const commutes = localityCommutes.get(cand.id) ?? [];
      const effectiveCommute = localityEffectiveCommutes.get(cand.id) ?? {
        value: null,
        source: "unavailable",
        confidence: "none"
      };

      // Rank index relative to candidate set for rent scaling
      const relativeRank = candidates.length > 1 ? i / (candidates.length - 1) : 0.5;
      const rentBand = this.deps.rent.getRentEstimate(cand.id, cityResolution.name, relativeRank);
      const safetyIndicator = computeSafetyIndicator(rawProfile.safety);
      const householdFit = computeHouseholdFit(prefs.householdType, normalizedScores);

      const primaryCommute = commutes.find((c) => c.destinationId === prefs.workplace.id) ?? commutes[0];
      const exceedsMaxCommute = primaryCommute?.exceedsMax ?? false;

      const scoreResult = scoreArea({
        areaName: cand.name,
        preferences: prefs,
        effectiveCommute,
        rentBand,
        safetyIndicator,
        amenitiesScore: normalizedScores.amenitiesScore,
        transitAccessScore: normalizedScores.transitAccessScore,
        householdFit,
        exceedsMaxCommute
      });

      const summary: AreaSummary = {
        id: cand.id,
        name: cand.name,
        lat: cand.lat,
        lon: cand.lon,
        rank: 1, // Will be reassigned after sorting
        matchScore: scoreResult.matchScore,
        confidence: scoreResult.confidence,
        dataCompleteness: scoreResult.dataCompleteness,
        explanation: scoreResult.explanation,
        keyFacts: scoreResult.keyFacts,
        effectiveCommuteMin: effectiveCommute,
        rentBand,
        safetyIndicator,
        amenitiesScore: normalizedScores.amenitiesScore
      };

      const detail: AreaDetail = {
        ...summary,
        osmType: cand.osmType,
        osmId: cand.osmId,
        amenities: rawProfile.amenities,
        commutes,
        scoreBreakdown: scoreResult.scoreBreakdown,
        userRentOverride: this.deps.rent.getUserOverride(cand.id),
        safetyDetails: rawProfile.safety
      };

      preliminarySummaries.push(summary);
      detailsMap.set(cand.id, detail);
    }

    // Sort by match score descending, breaking ties by commute ascending
    preliminarySummaries.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      const commA = a.effectiveCommuteMin.value ?? 999;
      const commB = b.effectiveCommuteMin.value ?? 999;
      return commA - commB;
    });

    // Reassign ranks 1..N
    preliminarySummaries.forEach((s, idx) => {
      s.rank = idx + 1;
      const detail = detailsMap.get(s.id);
      if (detail) {
        detail.rank = idx + 1;
      }
    });

    // Stage 6: Done
    emit(
      "done",
      100,
      `Found ${preliminarySummaries.length} localities ranked by fit for ${cityResolution.name}`,
      preliminarySummaries,
      true
    );

    return {
      areas: preliminarySummaries,
      details: detailsMap
    };
  }
}
