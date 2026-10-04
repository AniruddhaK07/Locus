import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { AreaId, ComparisonResult } from "@engine";
import { getEngine } from "@engine";
import { ProvenanceBadge } from "../components/ProvenanceBadge";

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const engine = getEngine();

  const idsParam = searchParams.get("ids");
  const initialIds = idsParam ? idsParam.split(",").filter(Boolean) : [];
  const [areaIds, setAreaIds] = useState<AreaId[]>(initialIds);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (areaIds.length > 0) {
      setLoading(true);
      engine.compare(areaIds).then((res) => {
        if (active) {
          setResult(res);
          setLoading(false);
        }
      });
    } else {
      setResult(null);
      setLoading(false);
    }
    return () => { active = false; };
  }, [areaIds, engine]);

  const handleRemoveArea = (id: AreaId) => {
    const updated = areaIds.filter((item) => item !== id);
    setAreaIds(updated);
    navigate(`/compare?ids=${updated.join(",")}`, { replace: true });
  };

  if (loading) {
    return (
      <main data-feature="compare-screen" data-state="loading" className="box">
        <p>Loading comparison data...</p>
      </main>
    );
  }

  if (areaIds.length === 0 || !result || result.areas.length === 0) {
    return (
      <main data-feature="compare-screen" data-state="empty" className="box" style={{ textAlign: "center", padding: "32px" }}>
        <h2>No Localities Selected for Comparison</h2>
        <p>Select 2 or 3 localities from the search results or saved shortlist to compare side by side.</p>
        <button data-feature="back-to-results-btn" onClick={() => navigate("/results")}>
          &larr; Back to Results
        </button>
      </main>
    );
  }

  return (
    <main data-feature="compare-screen" data-state="ready" className="box">
      <header className="row" style={{ justifyContent: "space-between" }}>
        <h2>Side-by-Side Locality Comparison ({result.areas.length} areas)</h2>
        <button onClick={() => navigate("/results")}>
          &larr; Back to Search Results
        </button>
      </header>

      <div style={{ overflowX: "auto", marginTop: "16px" }}>
        <table data-feature="comparison-table">
          <thead>
            <tr>
              <th style={{ width: "200px" }}>Attribute / Metric</th>
              {result.areas.map((area) => (
                <th key={area.id} style={{ minWidth: "220px" }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span>{area.name}</span>
                    <button
                      type="button"
                      data-feature="remove-area-btn"
                      onClick={() => handleRemoveArea(area.id)}
                      title="Remove from comparison"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "normal", color: "#666" }}>
                    Rank #{area.rank} · {area.matchScore}% Match
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.metric} data-feature="metric-row">
                <td><strong>{row.label}</strong></td>
                {result.areas.map((area) => {
                  const val = row.values[area.id];
                  const isWinner = row.winnerId === area.id;
                  return (
                    <td
                      key={area.id}
                      className={isWinner ? "winner" : ""}
                      data-feature={isWinner ? "winner-marker" : undefined}
                    >
                      <div className="row">
                        <span>{typeof val?.value === "object" ? JSON.stringify(val.value) : String(val?.value ?? "N/A")}</span>
                        {isWinner && <span className="badge winner">[WINNER]</span>}
                      </div>
                      {val && (
                        <div style={{ marginTop: "4px" }}>
                          <ProvenanceBadge source={val.source} confidence={val.confidence} note={val.note} />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
