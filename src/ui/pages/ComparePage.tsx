import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import type { AreaId, ComparisonResult, Measured } from "@engine";
import { getEngine } from "@engine";
import { ProvenanceBadge } from "../primitives/ProvenanceBadge";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { Skeleton } from "../primitives/Skeleton";
import { EmptyState } from "../primitives/EmptyState";
import { formatCommute, formatRentBand, formatIndianNumber } from "../utils/format";

export function ComparePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const engine = getEngine();

  const idsParam = searchParams.get("ids");
  const initialIds = idsParam ? idsParam.split(",").filter(Boolean) : [];
  const [areaIds, setAreaIds] = useState<AreaId[]>(initialIds);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(initialIds.length > 0);
  const [savedIds, setSavedIds] = useState<AreaId[]>(() => engine.saved.list());

  useEffect(() => {
    return engine.saved.subscribe(() => {
      setSavedIds(engine.saved.list());
    });
  }, [engine]);

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
    return () => {
      active = false;
    };
  }, [areaIds, engine]);

  const handleRemoveArea = (id: AreaId) => {
    const updated = areaIds.filter((item) => item !== id);
    setAreaIds(updated);
    navigate(`/compare?ids=${updated.join(",")}`, { replace: true });
  };

  const handleAddArea = (id: AreaId) => {
    if (areaIds.length >= 3) return;
    if (areaIds.includes(id)) return;
    const updated = [...areaIds, id];
    setAreaIds(updated);
    navigate(`/compare?ids=${updated.join(",")}`, { replace: true });
  };

  // Saved candidate IDs available to add
  const availableToAdd = savedIds.filter((id) => !areaIds.includes(id));

  const formatCellValue = (
    metric: string,
    val: Measured<string | number | { low: number; high: number }> | undefined
  ) => {
    if (!val || val.value === null || val.value === undefined) {
      return "Not available";
    }
    if (typeof val.value === "object" && "low" in val.value && "high" in val.value) {
      return formatRentBand(val.value);
    }
    if (metric === "effectiveCommuteMin" || metric === "commute") {
      return formatCommute(Number(val.value));
    }
    if (typeof val.value === "number") {
      return formatIndianNumber(val.value);
    }
    return String(val.value);
  };

  if (loading) {
    return (
      <main data-feature="compare-screen" data-state="loading" className="locus-compare">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
          <Skeleton width="220px" height="36px" />
          <Skeleton width="140px" height="36px" />
        </div>
        <Card>
          <Skeleton width="100%" height="320px" />
        </Card>
      </main>
    );
  }

  if (areaIds.length === 0 || !result || result.areas.length === 0) {
    return (
      <main data-feature="compare-screen" data-state="empty" className="locus-compare">
        <header className="locus-compare__header">
          <h1 className="locus-compare__title">Side-by-Side Comparison</h1>
        </header>

        <EmptyState
          message="No neighbourhoods selected for comparison. Select 2 or 3 localities from your search results or saved shortlist."
          action={{
            label: "Browse Search Results",
            onClick: () => navigate("/results"),
          }}
        />
      </main>
    );
  }

  return (
    <main data-feature="compare-screen" data-state="ready" className="locus-compare">
      {/* Header */}
      <header className="locus-compare__header">
        <div>
          <h1 className="locus-compare__title">
            Side-by-Side Locality Comparison
          </h1>
          <span className="locus-compare__meta">
            Comparing {result.areas.length} {result.areas.length === 1 ? "neighbourhood" : "neighbourhoods"} (Maximum 3)
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate("/results")}
        >
          ← Back to Results
        </Button>
      </header>

      {/* Add from Saved (if < 3 areas currently in comparison) */}
      {result.areas.length < 3 && availableToAdd.length > 0 && (
        <div className="locus-compare__add-section">
          <span style={{ fontWeight: 600 }}>Add from Saved Shortlist:</span>
          {availableToAdd.map((id) => (
            <Button
              key={id}
              variant="secondary"
              size="sm"
              onClick={() => handleAddArea(id)}
            >
              + Add {id.split("/")[1] || id}
            </Button>
          ))}
        </div>
      )}

      {/* Responsive Matrix with Sticky Row Header Column */}
      <div className="locus-compare__table-wrap">
        <table className="locus-compare__table" data-feature="comparison-table">
          <thead>
            <tr>
              <th>Criterion / Metric</th>
              {result.areas.map((area) => (
                <th key={area.id} style={{ minWidth: "240px" }}>
                  <div className="locus-compare__area-header">
                    <div className="locus-compare__area-title-row">
                      <Link
                        to={`/area/${encodeURIComponent(area.id)}`}
                        className="locus-compare__area-name"
                      >
                        {area.name}
                      </Link>
                      <button
                        type="button"
                        data-feature="remove-area-btn"
                        className="locus-compare__remove-btn"
                        onClick={() => handleRemoveArea(area.id)}
                        aria-label={`Remove ${area.name} from comparison`}
                        title="Remove from comparison"
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--ink-muted)" }}>
                      <span>Rank #{area.rank}</span>
                      <span>·</span>
                      <strong style={{ color: "var(--ink)" }}>{area.matchScore}% Match</strong>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.metric} data-feature="metric-row">
                <td>
                  <strong>{row.label}</strong>
                </td>
                {result.areas.map((area) => {
                  const val = row.values[area.id];
                  const isWinner = row.winnerId === area.id;
                  return (
                    <td
                      key={area.id}
                      className={isWinner ? "winner" : ""}
                      data-feature={isWinner ? "winner-marker" : undefined}
                    >
                      <div className="locus-compare__val-row">
                        <span>{formatCellValue(row.metric, val)}</span>
                        {isWinner && (
                          <span className="locus-compare__winner-badge">
                            ✓ Best
                          </span>
                        )}
                      </div>

                      {val && (
                        <div style={{ marginTop: "4px" }}>
                          <ProvenanceBadge
                            source={val.source}
                            confidence={val.confidence}
                            note={val.note}
                          />
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
