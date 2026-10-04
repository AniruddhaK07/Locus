import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AreaDetail, AreaId } from "@engine";
import { getEngine } from "@engine";
import { ProvenanceBadge } from "../components/ProvenanceBadge";

export function SavedPage() {
  const navigate = useNavigate();
  const engine = getEngine();

  const [savedIds, setSavedIds] = useState<AreaId[]>(engine.saved.list());
  const [details, setDetails] = useState<AreaDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<AreaId[]>([]);

  useEffect(() => {
    const unsub = engine.saved.subscribe(() => {
      setSavedIds(engine.saved.list());
    });
    return unsub;
  }, [engine]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all(savedIds.map((id) => engine.getArea(id))).then((results) => {
      if (active) {
        setDetails(results.filter((a): a is AreaDetail => a !== null));
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [savedIds, engine]);

  const handleRemove = (id: AreaId) => {
    engine.saved.toggle(id);
    setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
  };

  const handleToggleSelectCompare = (id: AreaId) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert("Maximum 3 areas can be compared.");
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleCompareSelected = () => {
    if (selectedForCompare.length < 2) {
      alert("Please select at least 2 areas to compare.");
      return;
    }
    navigate(`/compare?ids=${selectedForCompare.join(",")}`);
  };

  if (loading) {
    return (
      <main data-feature="saved-screen" data-state="loading" className="box">
        <p>Loading saved localities...</p>
      </main>
    );
  }

  if (details.length === 0) {
    return (
      <main data-feature="saved-screen" data-state="empty" className="box" style={{ textAlign: "center", padding: "32px" }}>
        <h2>No Saved Localities</h2>
        <p>You haven't saved any neighbourhoods yet. Click the "Save" button on any result card to add it here.</p>
        <button onClick={() => navigate("/results")}>Browse Localities &rarr;</button>
      </main>
    );
  }

  return (
    <main data-feature="saved-screen" data-state="ready" className="box">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <h2>Saved Localities ({details.length})</h2>
        {selectedForCompare.length >= 2 && (
          <button
            type="button"
            data-feature="compare-selected-btn"
            style={{ fontWeight: "bold" }}
            onClick={handleCompareSelected}
          >
            Compare Selected ({selectedForCompare.length}) &rarr;
          </button>
        )}
      </header>

      <section data-feature="saved-list" className="grid" style={{ marginTop: "16px" }}>
        {details.map((area) => (
          <article key={area.id} className="box" data-feature="saved-item-card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>{area.name}</h3>
              <span className="badge winner">{area.matchScore}% Match</span>
            </div>

            <p style={{ fontSize: "12px", fontStyle: "italic", margin: "6px 0" }}>
              {area.explanation}
            </p>

            <div className="row" style={{ margin: "6px 0" }}>
              <ProvenanceBadge source={area.confidence === "high" ? "osm" : "heuristic"} confidence={area.confidence} />
              <span style={{ fontSize: "11px" }}>
                Peak Commute: {area.effectiveCommuteMin.value ?? "N/A"} min
              </span>
            </div>

            <div className="row" style={{ justifyContent: "space-between", marginTop: "12px" }}>
              <label style={{ fontSize: "12px" }}>
                <input
                  type="checkbox"
                  data-feature="compare-select-checkbox"
                  checked={selectedForCompare.includes(area.id)}
                  onChange={() => handleToggleSelectCompare(area.id)}
                />
                Select to Compare
              </label>

              <div className="row">
                <button
                  type="button"
                  data-feature="remove-saved-btn"
                  onClick={() => handleRemove(area.id)}
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/area/${encodeURIComponent(area.id)}`)}
                >
                  Details &rarr;
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
