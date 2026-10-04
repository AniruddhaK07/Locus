import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { AreaDetail, AreaId } from "@engine";
import { getEngine } from "@engine";
import { ConfidenceMark } from "../primitives/ConfidenceMark";
import { ProvenanceBadge } from "../primitives/ProvenanceBadge";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { Skeleton } from "../primitives/Skeleton";
import { Toast } from "../primitives/Toast";
import { EmptyState } from "../primitives/EmptyState";
import { formatCommute, formatRentBand } from "../utils/format";

export function SavedPage() {
  const navigate = useNavigate();
  const engine = getEngine();

  const [savedIds, setSavedIds] = useState<AreaId[]>(() => engine.saved.list());
  const [details, setDetails] = useState<AreaDetail[]>([]);
  const [loading, setLoading] = useState(() => engine.saved.list().length > 0);
  const [selectedForCompare, setSelectedForCompare] = useState<AreaId[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    return engine.saved.subscribe(() => {
      setSavedIds(engine.saved.list());
    });
  }, [engine]);

  useEffect(() => {
    let active = true;
    if (savedIds.length === 0) {
      setDetails([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(savedIds.map((id) => engine.getArea(id))).then((results) => {
      if (active) {
        setDetails(results.filter((a): a is AreaDetail => a !== null));
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [savedIds, engine]);

  const handleRemove = (id: AreaId) => {
    engine.saved.toggle(id);
    setSelectedForCompare((prev) => prev.filter((item) => item !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Remove all saved neighbourhoods from your shortlist?")) {
      for (const id of savedIds) {
        engine.saved.toggle(id);
      }
      setSelectedForCompare([]);
    }
  };

  const handleToggleSelectCompare = (id: AreaId) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare((prev) => prev.filter((item) => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        setToastMessage("Maximum 3 neighbourhoods can be compared simultaneously.");
        return;
      }
      setSelectedForCompare((prev) => [...prev, id]);
    }
  };

  const handleCompareSelected = () => {
    if (selectedForCompare.length < 2) {
      setToastMessage("Please select at least 2 neighbourhoods to compare.");
      return;
    }
    navigate(`/compare?ids=${selectedForCompare.join(",")}`);
  };

  const handleCopyShortlist = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const shareUrl = `${window.location.origin}/compare?ids=${savedIds.join(",")}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        setToastMessage("Shortlist comparison link copied to clipboard!");
      });
    }
  };

  if (loading) {
    return (
      <main data-feature="saved-screen" data-state="loading" className="locus-saved">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <Skeleton width="180px" height="36px" />
          <Skeleton width="120px" height="36px" />
        </div>
        {[1, 2].map((n) => (
          <Card key={n}>
            <Skeleton width="40%" height="24px" style={{ marginBottom: "12px" }} />
            <Skeleton width="80%" height="16px" style={{ marginBottom: "8px" }} />
            <Skeleton width="60%" height="16px" />
          </Card>
        ))}
      </main>
    );
  }

  if (details.length === 0) {
    return (
      <main data-feature="saved-screen" data-state="empty" className="locus-saved">
        <header className="locus-saved__header">
          <div className="locus-saved__title-group">
            <h1 className="locus-saved__title">Saved Localities</h1>
            <span className="locus-saved__count-badge">0</span>
          </div>
        </header>

        <EmptyState
          message="You haven't saved any neighbourhoods yet. Click the bookmark icon on any result card to save it here for side-by-side comparison."
          action={{
            label: "Explore Neighbourhoods",
            onClick: () => navigate("/results"),
          }}
        />
      </main>
    );
  }

  return (
    <main data-feature="saved-screen" data-state="ready" className="locus-saved">
      {/* Toast Alert */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onDismiss={() => setToastMessage(null)}
        />
      )}

      {/* Header & Action Bar */}
      <header className="locus-saved__header">
        <div className="locus-saved__title-group">
          <h1 className="locus-saved__title">Saved Localities</h1>
          <span className="locus-saved__count-badge">{details.length}</span>
        </div>

        <div className="locus-saved__actions">
          {selectedForCompare.length >= 2 ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-feature="compare-selected-btn"
              onClick={handleCompareSelected}
            >
              Compare Selected ({selectedForCompare.length}) →
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={details.length < 2}
              onClick={() => {
                const auto = details.slice(0, 3).map((d) => d.id);
                navigate(`/compare?ids=${auto.join(",")}`);
              }}
            >
              Compare All →
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyShortlist}
          >
            Copy Shortlist Link
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            style={{ color: "var(--danger)" }}
          >
            Clear All
          </Button>
        </div>
      </header>

      {/* Saved Cards Feed */}
      <section data-feature="saved-list" className="locus-saved__feed">
        {details.map((area) => {
          const isSelected = selectedForCompare.includes(area.id);
          return (
            <article
              key={area.id}
              data-feature="saved-item-card"
              className={`locus-saved-card ${isSelected ? "locus-saved-card--selected" : ""}`}
            >
              <div className="locus-saved-card__header">
                <div className="locus-saved-card__title-row">
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)", fontVariantNumeric: "tabular-nums" }}>
                    #{area.rank}
                  </span>
                  <Link
                    to={`/area/${encodeURIComponent(area.id)}`}
                    className="locus-saved-card__name"
                  >
                    {area.name}
                  </Link>
                  <ConfidenceMark confidence={area.confidence} showWord={false} />
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", fontWeight: 600 }}>
                    {area.matchScore}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)" }}>
                    Match
                  </span>
                </div>
              </div>

              <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)", margin: 0, lineHeight: "var(--leading-base)" }}>
                {area.explanation}
              </p>

              <div className="locus-saved-card__metrics">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Commute:</span>
                  <strong>{formatCommute(area.effectiveCommuteMin.value)}</strong>
                  <ProvenanceBadge source={area.effectiveCommuteMin.source} confidence={area.effectiveCommuteMin.confidence} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>Rent:</span>
                  <strong>{formatRentBand(area.rentBand.value)}</strong>
                </div>
              </div>

              <div className="locus-saved-card__footer">
                <label className="locus-saved-card__select-label">
                  <input
                    type="checkbox"
                    data-feature="compare-select-checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectCompare(area.id)}
                  />
                  <span>Select for comparison</span>
                </label>

                <div className="locus-saved-card__btn-group">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-feature="remove-saved-btn"
                    onClick={() => handleRemove(area.id)}
                  >
                    Remove
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/area/${encodeURIComponent(area.id)}`)}
                  >
                    Details →
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
