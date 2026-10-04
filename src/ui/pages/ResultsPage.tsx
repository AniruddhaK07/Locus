import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { AreaId, Preferences, SearchState, SortOption, TransportMode, HouseholdType } from "@engine";
import { getEngine, setEngineMode, selectAreas } from "@engine";
import { AreaCard } from "../components/AreaCard";
import { PipelineProgress } from "../components/PipelineProgress";
import { RefineDisclosure } from "../components/RefineDisclosure";
import { CompareStickyBar } from "../components/CompareStickyBar";
import { LocusMap } from "../components/LocusMap";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { Skeleton } from "../primitives/Skeleton";
import { Toast } from "../primitives/Toast";
import { EmptyState } from "../primitives/EmptyState";
import { ErrorState } from "../primitives/ErrorState";
import { formatCurrency } from "../utils/format";

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const engine = getEngine();

  // Parse preferences from URL query string or fall back to sensible defaults
  const prefs: Preferences = useMemo(() => {
    const parsed = engine.queryToPrefs(searchParams.toString());
    if (parsed) return parsed;

    const rawMode = searchParams.get("mode");
    const mode: TransportMode = rawMode === "bike" || rawMode === "walk" ? rawMode : "car";

    const rawHousehold = searchParams.get("household");
    const household: HouseholdType =
      rawHousehold === "student" ||
      rawHousehold === "couple" ||
      rawHousehold === "family"
        ? rawHousehold
        : "balanced";

    const rawPriority = searchParams.get("priority");
    const priority: Preferences["priorityFocus"] =
      rawPriority === "commute" ||
      rawPriority === "budget" ||
      rawPriority === "amenities" ||
      rawPriority === "safety" ||
      rawPriority === "transit"
        ? rawPriority
        : "commute";

    return {
      city: searchParams.get("city") || "Bengaluru",
      workplace: {
        id: "wp",
        label: "Workplace",
        name: searchParams.get("wpName") || "Manyata Tech Park",
        lat: Number(searchParams.get("wpLat")) || 13.0489,
        lon: Number(searchParams.get("wpLon")) || 77.62,
      },
      destinations: [],
      transportMode: mode,
      maxCommuteMin: Number(searchParams.get("maxCommute")) || 45,
      budgetMin: Number(searchParams.get("budgetMin")) || 20000,
      budgetMax: Number(searchParams.get("budgetMax")) || 60000,
      householdType: household,
      priorityFocus: priority,
    };
  }, [searchParams, engine]);

  const [searchState, setSearchState] = useState<SearchState>({
    id: "init",
    stage: "idle",
    progress: 0,
    statusMessage: "Initializing search...",
    areas: [],
    totalCandidates: 0,
    errors: [],
    isComplete: false,
  });

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [filterMaxCommute, setFilterMaxCommute] = useState<number>(prefs.maxCommuteMin);
  const [filterMinMatch, setFilterMinMatch] = useState<number>(0);
  const [filterHideLowConfidence, setFilterHideLowConfidence] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<AreaId[]>([]);
  const [savedIds, setSavedIds] = useState<AreaId[]>(() => engine.saved.list());
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Sync filterMaxCommute if user navigates with new query params
  useEffect(() => {
    setFilterMaxCommute(prefs.maxCommuteMin);
  }, [prefs.maxCommuteMin]);

  // Subscribe to saved store
  useEffect(() => {
    return engine.saved.subscribe(() => {
      setSavedIds(engine.saved.list());
    });
  }, [engine]);

  // Execute progressive search pipeline
  useEffect(() => {
    const handle = engine.startSearch(prefs);
    const unsub = handle.subscribe((state) => {
      setSearchState(state);
    });

    const handleScenarioChange = () => {
      handle.cancel();
      const newHandle = engine.startSearch(prefs);
      newHandle.subscribe((s) => setSearchState(s));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("locus_scenario_change", handleScenarioChange);
    }

    return () => {
      handle.cancel();
      unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("locus_scenario_change", handleScenarioChange);
      }
    };
  }, [prefs, engine, searchTrigger]);

  // Sort and filter candidate areas using pure engine function
  const filteredAreas = useMemo(() => {
    return selectAreas(searchState.areas, {
      sort: sortBy,
      filters: {
        maxCommuteMin: filterMaxCommute,
        minMatchScore: filterMinMatch,
        hideLowConfidence: filterHideLowConfidence,
      },
    });
  }, [searchState.areas, sortBy, filterMaxCommute, filterMinMatch, filterHideLowConfidence]);

  const displayedAreas = filteredAreas.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAreas.length;

  const handleToggleSave = useCallback(
    (id: AreaId) => {
      engine.saved.toggle(id);
    },
    [engine]
  );

  const handleToggleCompare = useCallback((id: AreaId) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleClearCompare = () => {
    setSelectedForCompare([]);
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      navigate(`/compare?ids=${selectedForCompare.join(",")}`);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setToastMessage("Link copied to clipboard");
    }
  };

  const handleRetrySearch = () => {
    setSearchTrigger((prev) => prev + 1);
  };

  const handleUseSnapshot = () => {
    setEngineMode("snapshot");
    const query = engine.prefsToQuery(prefs);
    if (typeof window !== "undefined") {
      window.location.href = `/results?${query}&engine=snapshot`;
    } else {
      navigate(`/results?${query}&engine=snapshot`);
    }
  };

  // Determine current screen state for integration inspection
  let screenState: "loading" | "ready" | "partial" | "empty" | "error" | "sparse-data" = "ready";
  if (searchState.stage === "error" || (searchState.errors && searchState.errors.length > 0 && searchState.areas.length === 0)) {
    screenState = "error";
  } else if (!searchState.isComplete && searchState.areas.length === 0) {
    screenState = "loading";
  } else if (searchState.isComplete && searchState.areas.length === 0) {
    screenState = "empty";
  } else if (searchState.localityErrors && Object.keys(searchState.localityErrors).length > 0) {
    screenState = "partial";
  } else if (
    searchState.areas.length > 0 &&
    searchState.areas.every((a) => a.dataCompleteness < 0.6)
  ) {
    screenState = "sparse-data";
  }

  const isMapActive = viewMode === "map";

  return (
    <main
      data-feature="results-screen"
      data-state={screenState}
      className="locus-results"
    >
      {/* 1. TOP PREFERENCES SUMMARY BAR */}
      <section className="locus-results__summary-bar" data-feature="prefs-summary">
        <div className="locus-results__summary-content">
          <span className="locus-results__summary-title">{prefs.city}</span>
          <span>· Near {prefs.workplace.name}</span>
          <div className="locus-results__summary-pills">
            <span>({prefs.transportMode}, max {prefs.maxCommuteMin}m, {formatCurrency(prefs.budgetMax)}/mo)</span>
          </div>
        </div>

        <div className="locus-results__summary-actions">
          <Button
            variant="ghost"
            size="sm"
            data-feature="copy-share-btn"
            onClick={handleCopyLink}
          >
            Copy link
          </Button>

          <Button
            variant="secondary"
            size="sm"
            data-feature="edit-prefs-btn"
            onClick={() => navigate("/plan")}
          >
            Edit
          </Button>
        </div>
      </section>

      {/* 2. PROGRESSIVE PIPELINE PROGRESS LINE & STATUS */}
      <PipelineProgress
        stage={searchState.stage}
        progress={searchState.progress}
        statusMessage={searchState.statusMessage}
        isComplete={searchState.isComplete}
      />

      {/* Partial failure notice if Overpass rate-limits occurred */}
      {screenState === "partial" && searchState.localityErrors && (
        <aside
          role="status"
          className="locus-field"
          style={{
            padding: "8px 14px",
            backgroundColor: "rgba(247, 168, 161, 0.2)",
            border: "1px solid var(--line-strong)",
            borderRadius: "var(--radius-sm)",
            fontSize: "var(--text-xs)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              <strong>Partial Search Note:</strong> {Object.keys(searchState.localityErrors).length} localities could not be verified due to server rate limits.
            </span>
          </div>
        </aside>
      )}

      {/* 3. TOOLBAR: Results Count, View Toggle, Refine Disclosure */}
      <div className="locus-results__toolbar">
        <span className="locus-results__count-text">
          {searchState.areas.length > 0
            ? `${filteredAreas.length} ranked candidate neighbourhoods`
            : "Searching candidate areas..."}
        </span>

        {/* View Toggle: List vs Map (Segmented Control) */}
        <div className="locus-view-toggle" data-feature="view-toggle" role="group" aria-label="Result View Mode">
          <button
            type="button"
            className={`locus-view-toggle__btn ${viewMode === "list" ? "locus-view-toggle__btn--active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            List
          </button>
          <button
            type="button"
            className={`locus-view-toggle__btn ${viewMode === "map" ? "locus-view-toggle__btn--active" : ""}`}
            onClick={() => setViewMode("map")}
          >
            Map
          </button>
        </div>
      </div>

      {/* Collapsed Refine Disclosure */}
      <RefineDisclosure
        sortBy={sortBy}
        onSortChange={setSortBy}
        maxCommuteMin={filterMaxCommute}
        onMaxCommuteChange={setFilterMaxCommute}
        minMatchScore={filterMinMatch}
        onMinMatchChange={setFilterMinMatch}
        hideLowConfidence={filterHideLowConfidence}
        onHideLowConfidenceChange={setFilterHideLowConfidence}
      />

      {/* 4. MAIN CANDIDATE FEED & MAP LAYOUT */}
      <div className={`locus-results__layout ${isMapActive ? "locus-results__layout--with-map" : ""}`}>
        {/* Candidate Feed (Single-column at comfortable reading width) */}
        <div className="locus-area-feed" data-feature="area-list">
          {/* Error State */}
          {screenState === "error" && (
            <ErrorState
              message={
                searchState.errors[0] ||
                "External map or locality services could not complete requests (e.g. Overpass API 406 Not Acceptable or network timeout). Live searches are currently blocked by upstream service policies."
              }
              onRetry={handleRetrySearch}
              retryLabel="Try again"
              secondaryAction={{
                label: "Use recorded demo cities",
                onClick: handleUseSnapshot,
                dataFeature: "use-snapshot-btn",
              }}
            />
          )}

          {/* Empty State */}
          {screenState === "empty" && (
            <EmptyState
              message="No neighbourhoods matched your commute or budget criteria."
              action={{
                label: "Adjust Preferences",
                onClick: () => navigate("/plan"),
              }}
            />
          )}

          {/* Filtered Empty State (Candidates exist, but active filters excluded them all) */}
          {(screenState === "ready" || screenState === "partial") && filteredAreas.length === 0 && searchState.areas.length > 0 && (
            <EmptyState
              message="No neighbourhoods match the active filter criteria. Try extending the commute limit or lowering the match threshold."
              action={{
                label: "Reset Filters",
                onClick: () => {
                  setFilterMaxCommute(90);
                  setFilterMinMatch(0);
                  setFilterHideLowConfidence(false);
                },
              }}
            />
          )}

          {/* Loading Skeletons (Matching card dimensions to guarantee zero layout shift) */}
          {screenState === "loading" && (
            <>
              {[1, 2, 3].map((n) => (
                <Card key={n} className="locus-area-card--skeleton">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                    <Skeleton width="45%" height="1.5rem" />
                    <Skeleton width="20%" height="2rem" />
                  </div>
                  <Skeleton width="90%" height="1rem" style={{ marginBottom: "8px" }} />
                  <Skeleton width="75%" height="1rem" style={{ marginBottom: "16px" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                    <Skeleton width="100%" height="3rem" />
                    <Skeleton width="100%" height="3rem" />
                    <Skeleton width="100%" height="3rem" />
                  </div>
                </Card>
              ))}
            </>
          )}

          {/* Render Candidate Area Cards */}
          {displayedAreas.map((area, idx) => (
            <AreaCard
              key={area.id}
              area={area}
              isSaved={savedIds.includes(area.id)}
              onToggleSave={handleToggleSave}
              isCompared={selectedForCompare.includes(area.id)}
              onToggleCompare={handleToggleCompare}
              staggerIndex={idx}
            />
          ))}

          {/* Load More Button */}
          {hasMore && screenState !== "loading" && screenState !== "empty" && screenState !== "error" && (
            <div style={{ textAlign: "center", margin: "var(--space-6) 0" }}>
              <Button
                variant="secondary"
                data-feature="load-more-btn"
                onClick={() => setVisibleCount((prev) => prev + 10)}
              >
                Load more candidate neighbourhoods
              </Button>
            </div>
          )}
        </div>

        {/* Map Column (Desktop side-by-side or active map container) */}
        {isMapActive && (
          <div className="locus-results__map-col" data-feature="map-placeholder">
            <LocusMap
              points={filteredAreas.map((a, idx) => ({
                id: a.id,
                name: a.name,
                lat: a.lat,
                lon: a.lon,
                rank: idx + 1,
                matchScore: a.matchScore,
              }))}
              workplace={prefs.workplace}
              height="520px"
              onSelectPoint={(id) => navigate(`/area/${encodeURIComponent(id)}`)}
            />
          </div>
        )}
      </div>

      {/* 5. FLOATING STICKY COMPARE BAR */}
      <CompareStickyBar
        selectedCount={selectedForCompare.length}
        maxCount={3}
        onClear={handleClearCompare}
        onCompare={handleCompare}
      />

      {/* Auto-dismissing Toast Feedback */}
      {toastMessage && (
        <div className="locus-toast-container">
          <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        </div>
      )}
    </main>
  );
}
