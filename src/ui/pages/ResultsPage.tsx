import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { AreaId, Preferences, SearchState, SortOption } from "@engine";
import { getEngine, selectAreas } from "@engine";
import { ProvenanceBadge } from "../components/ProvenanceBadge";

export function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const engine = getEngine();

  // Parse prefs from URL or defaults
  const prefs: Preferences = useMemo(() => {
    const parsed = engine.queryToPrefs(searchParams.toString());
    if (parsed) return parsed;
    return {
      city: "Bengaluru",
      workplace: { id: "wp", label: "Workplace", name: "Manyata Tech Park", lat: 13.0489, lon: 77.6200 },
      destinations: [],
      transportMode: "car",
      maxCommuteMin: 45,
      budgetMin: 20000,
      budgetMax: 60000,
      householdType: "balanced"
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
    isComplete: false
  });

  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [filterMaxCommute, setFilterMaxCommute] = useState<number>(prefs.maxCommuteMin);
  const [filterMinMatch, setFilterMinMatch] = useState<number>(0);
  const [filterHideLowConfidence, setFilterHideLowConfidence] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<AreaId[]>([]);
  const [savedIds, setSavedIds] = useState<AreaId[]>(engine.saved.list());
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const [shareCopied, setShareCopied] = useState(false);

  // Subscribe to saved store
  useEffect(() => {
    return engine.saved.subscribe(() => {
      setSavedIds(engine.saved.list());
    });
  }, [engine]);

  // Execute search progression
  useEffect(() => {
    const handle = engine.startSearch(prefs);
    const unsub = handle.subscribe((state) => {
      setSearchState(state);
    });

    const handleScenarioChange = () => {
      // Re-trigger search when scenario switcher flips
      handle.cancel();
      const newHandle = engine.startSearch(prefs);
      newHandle.subscribe((s) => setSearchState(s));
    };

    window.addEventListener("locus_scenario_change", handleScenarioChange);

    return () => {
      handle.cancel();
      unsub();
      window.removeEventListener("locus_scenario_change", handleScenarioChange);
    };
  }, [prefs, engine]);

  // Sort and filter areas using pure engine function
  const filteredAreas = useMemo(() => {
    return selectAreas(searchState.areas, {
      sort: sortBy,
      filters: {
        maxCommuteMin: filterMaxCommute,
        minMatchScore: filterMinMatch,
        hideLowConfidence: filterHideLowConfidence
      }
    });
  }, [searchState.areas, sortBy, filterMaxCommute, filterMinMatch, filterHideLowConfidence]);

  const displayedAreas = filteredAreas.slice(0, visibleCount);

  const toggleCompare = (id: AreaId) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert("Maximum 3 areas can be compared side by side.");
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard?.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Determine current screen state
  const screenState = !searchState.isComplete
    ? "loading"
    : searchState.stage === "error"
    ? "error"
    : searchState.errors.length > 0 && searchState.areas.length > 0
    ? "partial"
    : filteredAreas.length === 0
    ? "empty"
    : "ready";

  return (
    <main data-feature="results-screen" data-state={screenState} className="box">
      {/* 1. PREFERENCES SUMMARY HEADER */}
      <header className="box" data-feature="prefs-summary">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <strong>Search:</strong> {prefs.city} · Workplace: {prefs.workplace.name} · Mode: {prefs.transportMode} · Max: {prefs.maxCommuteMin}m · Budget: ₹{prefs.budgetMax.toLocaleString("en-IN")}
            {prefs.destinations.length > 0 && (
              <span> · +{prefs.destinations.length} destinations</span>
            )}
          </div>
          <div className="row">
            <button data-feature="edit-prefs-btn" onClick={() => navigate("/plan")}>
              Edit Preferences
            </button>
            <button data-feature="copy-share-btn" onClick={handleCopyShareLink}>
              {shareCopied ? "✓ Copied!" : "Copy Share Link"}
            </button>
          </div>
        </div>
      </header>

      {/* 2. PIPELINE PROGRESS PANEL */}
      <section
        className="box"
        data-feature="pipeline-progress-panel"
        data-state={!searchState.isComplete ? "loading" : searchState.stage === "error" ? "error" : "ready"}
      >
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Pipeline Status: [{searchState.stage}]</strong>
          <span>Progress: {searchState.progress}%</span>
        </div>
        <p style={{ margin: "4px 0", fontSize: "13px" }}>{searchState.statusMessage}</p>

        {/* Stage step indicators */}
        <div className="row" style={{ fontSize: "11px", margin: "6px 0" }}>
          {["resolving-city", "discovering-localities", "routing", "profiling-amenities", "scoring", "done"].map((st) => (
            <span
              key={st}
              data-feature="stage-item"
              data-stage={st}
              className={`badge ${searchState.stage === st ? "winner" : ""}`}
            >
              {st}
            </span>
          ))}
        </div>

        {searchState.errors.length > 0 && (
          <div className="error-msg" data-feature="pipeline-errors">
            {searchState.errors.map((err, i) => (
              <div key={i}>⚠ {err}</div>
            ))}
          </div>
        )}
      </section>

      {/* 3. TOOLBAR CONTROLS (Sort, View Mode, Filters) */}
      <section className="row" style={{ justifyContent: "space-between", margin: "12px 0" }}>
        <div className="row">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            data-feature="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "match" | "commute" | "amenities" | "rent")}
          >
            <option value="match">Match Score (Highest first)</option>
            <option value="commute">Commute Time (Shortest first)</option>
            <option value="amenities">Amenities Access (Densest first)</option>
            <option value="rent">Rent Band (Lowest first)</option>
          </select>

          <button
            data-feature="view-toggle"
            onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
            style={{ marginLeft: "12px" }}
          >
            Switch to {viewMode === "list" ? "Map View" : "List View"}
          </button>
        </div>

        <div>
          Showing {displayedAreas.length} of {filteredAreas.length} localities
        </div>
      </section>

      {/* 4. FILTERS PANEL */}
      <fieldset data-feature="filter-panel">
        <legend>Filters & Refinements</legend>
        <div className="row">
          <div>
            <label htmlFor="filter-commute">Max Commute: {filterMaxCommute}m</label>
            <input
              id="filter-commute"
              type="range"
              data-feature="filter-max-commute"
              min="15"
              max="120"
              value={filterMaxCommute}
              onChange={(e) => setFilterMaxCommute(Number(e.target.value))}
            />
          </div>

          <div style={{ marginLeft: "16px" }}>
            <label htmlFor="filter-match">Min Match: {filterMinMatch}%</label>
            <input
              id="filter-match"
              type="range"
              data-feature="filter-min-match"
              min="0"
              max="95"
              value={filterMinMatch}
              onChange={(e) => setFilterMinMatch(Number(e.target.value))}
            />
          </div>

          <div style={{ marginLeft: "16px" }}>
            <label>
              <input
                type="checkbox"
                data-feature="filter-hide-low-conf"
                checked={filterHideLowConfidence}
                onChange={(e) => setFilterHideLowConfidence(e.target.checked)}
              />
              Hide Low Confidence Data
            </label>
          </div>
        </div>
      </fieldset>

      {/* 5. MAP PLACEHOLDER (When Map View active) */}
      {viewMode === "map" && (
        <section data-feature="map-placeholder" className="map-box">
          <div style={{ textAlign: "center" }}>
            <strong>[MAP VIEW PLACEHOLDER]</strong>
            <p>Interactive Leaflet map displaying {displayedAreas.length} locality markers and commute corridors.</p>
          </div>
        </section>
      )}

      {/* 6. AREA CARDS / LIST */}
      {viewMode === "list" && (
        <section data-feature="area-list" className="grid" style={{ marginTop: "16px" }}>
          {displayedAreas.map((area) => (
            <article
              key={area.id}
              className="box"
              data-feature="area-card"
              data-area-id={area.id}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="badge" data-feature="area-rank">Rank #{area.rank}</span>
                <span className="badge winner" data-feature="match-score">{area.matchScore}% Match</span>
              </div>

              <h3 data-feature="area-name" style={{ margin: "8px 0 4px" }}>
                {area.name}
              </h3>

              <div className="row" style={{ margin: "4px 0" }}>
                <ProvenanceBadge
                  source={area.effectiveCommuteMin.source}
                  confidence={area.confidence}
                  note={area.effectiveCommuteMin.note}
                />
                <span style={{ fontSize: "11px", color: "#666" }}>
                  Data completeness: {Math.round(area.dataCompleteness * 100)}%
                </span>
              </div>

              <p style={{ fontSize: "12px", fontStyle: "italic", margin: "6px 0" }}>
                {area.explanation}
              </p>

              <ul data-feature="key-facts" style={{ paddingLeft: "20px", fontSize: "12px", margin: "6px 0" }}>
                {area.keyFacts.map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
              </ul>

              <div className="row" style={{ justifyContent: "space-between", marginTop: "12px" }}>
                <label style={{ fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    data-feature="compare-checkbox"
                    checked={selectedForCompare.includes(area.id)}
                    onChange={() => toggleCompare(area.id)}
                  />
                  Compare
                </label>

                <div className="row">
                  <button
                    type="button"
                    data-feature="save-toggle-btn"
                    onClick={() => engine.saved.toggle(area.id)}
                  >
                    {savedIds.includes(area.id) ? "★ Saved" : "☆ Save"}
                  </button>
                  <button
                    type="button"
                    data-feature="details-link"
                    onClick={() => navigate(`/area/${encodeURIComponent(area.id)}`)}
                  >
                    Details &rarr;
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* EMPTY / ERROR STATES */}
      {searchState.isComplete && filteredAreas.length === 0 && searchState.stage !== "error" && (
        <div data-feature="empty-state" className="box" style={{ textAlign: "center", padding: "32px" }}>
          <h3>No localities match your filter criteria.</h3>
          <p>Try loosening your commute limit, adjusting budget bounds, or unchecking filters.</p>
        </div>
      )}

      {/* LOAD MORE */}
      {displayedAreas.length < filteredAreas.length && (
        <div style={{ textAlign: "center", margin: "16px 0" }}>
          <button
            type="button"
            data-feature="load-more-btn"
            onClick={() => setVisibleCount((prev) => prev + 6)}
          >
            Load More Localities ({filteredAreas.length - displayedAreas.length} remaining)
          </button>
        </div>
      )}

      {/* 7. STICKY COMPARE BAR */}
      {selectedForCompare.length > 0 && (
        <aside className="sticky-bar row" data-feature="compare-sticky-bar" style={{ justifyContent: "space-between" }}>
          <div>
            <strong>Comparing ({selectedForCompare.length} of 3):</strong> {selectedForCompare.join(", ")}
          </div>
          <div className="row">
            <button
              data-feature="clear-compare-btn"
              onClick={() => setSelectedForCompare([])}
            >
              Clear
            </button>
            <button
              data-feature="compare-btn"
              style={{ fontWeight: "bold" }}
              onClick={() => navigate(`/compare?ids=${selectedForCompare.join(",")}`)}
            >
              View Comparison &rarr;
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}
