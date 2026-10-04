import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { AreaDetail } from "@engine";
import { getEngine } from "@engine";
import { ConfidenceMark } from "../primitives/ConfidenceMark";
import { ProvenanceBadge } from "../primitives/ProvenanceBadge";
import { Button } from "../primitives/Button";
import { Card } from "../primitives/Card";
import { Skeleton } from "../primitives/Skeleton";
import { formatCommute, formatRentBand, formatCompleteness } from "../utils/format";

export function AreaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const engine = getEngine();

  const decodedId = id ? decodeURIComponent(id) : "";
  const [area, setArea] = useState<AreaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [overrideInput, setOverrideInput] = useState<string>("");
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    if (decodedId) {
      setLoading(true);
      engine.getArea(decodedId).then((res) => {
        if (active) {
          setArea(res);
          setIsSaved(engine.saved.has(decodedId));
          if (res?.userRentOverride) {
            setOverrideInput(String(res.userRentOverride));
          }
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [decodedId, engine]);

  const handleToggleSave = () => {
    if (!area) return;
    engine.saved.toggle(area.id);
    setIsSaved(engine.saved.has(area.id));
  };

  const handleSaveRentOverride = async () => {
    if (!area) return;
    const rentNum = overrideInput.trim() ? Number(overrideInput) : null;
    const updated = await engine.setRentOverride(area.id, rentNum);
    if (updated) {
      setArea(updated);
      setOverrideSuccess(true);
      setTimeout(() => setOverrideSuccess(false), 2500);
    }
  };

  if (loading) {
    return (
      <main data-feature="area-detail-screen" data-state="loading" className="locus-detail">
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
          <Skeleton width="120px" height="32px" />
          <Skeleton width="140px" height="32px" />
        </div>
        <Skeleton width="40%" height="2.5rem" style={{ marginBottom: "16px" }} />
        <Card className="locus-detail__hero-card">
          <Skeleton width="100%" height="80px" />
          <Skeleton width="80%" height="24px" />
        </Card>
        <Card className="locus-detail__section">
          <Skeleton width="100%" height="200px" />
        </Card>
      </main>
    );
  }

  if (!area) {
    return (
      <main data-feature="area-detail-screen" data-state="error" className="locus-detail">
        <div className="locus-detail__header" data-feature="area-header">
          <button
            type="button"
            data-feature="back-btn"
            className="locus-detail__back-btn"
            onClick={() => navigate(-1)}
          >
            ← Back to Results
          </button>
        </div>
        <Card className="locus-detail__section" style={{ textAlign: "center", padding: "48px 24px" }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", margin: "0 0 8px" }}>
            Area Record Not Found
          </h2>
          <p style={{ color: "var(--ink-muted)", fontSize: "var(--text-sm)", margin: "0 0 24px" }}>
            No verified neighbourhood record found matching ID &ldquo;{decodedId}&rdquo;.
          </p>
          <div>
            <Button variant="primary" onClick={() => navigate("/results")}>
              Return to Results
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const portals = engine.portals(area);
  const method = engine.method();

  const isSparse = area.dataCompleteness < 0.6;
  const screenState = isSparse ? "sparse-data" : "ready";

  return (
    <main data-feature="area-detail-screen" data-state={screenState} className="locus-detail">
      {/* 1. HEADER BAR */}
      <header className="locus-detail__header" data-feature="area-header">
        <div>
          <div className="locus-detail__nav-row">
            <button
              type="button"
              data-feature="back-btn"
              className="locus-detail__back-btn"
              onClick={() => navigate(-1)}
            >
              ← Back to Results
            </button>
            <span className="locus-detail__meta">
              OSM ID: {area.id} ({area.osmType})
            </span>
          </div>

          <div className="locus-detail__title-row">
            <h1 className="locus-detail__title">{area.name}</h1>
            <ConfidenceMark confidence={area.confidence} showWord />
          </div>
        </div>

        <button
          type="button"
          data-feature="save-toggle-btn"
          className="locus-detail__back-btn"
          onClick={handleToggleSave}
          aria-pressed={isSaved}
          style={{
            borderColor: isSaved ? "var(--ink)" : "var(--line)",
            backgroundColor: isSaved ? "var(--soft)" : "transparent",
            color: "var(--ink)",
          }}
        >
          {isSaved ? "★ Saved in Shortlist" : "☆ Save Locality"}
        </button>
      </header>

      {/* 2. MATCH SCORE HERO & NARRATIVE */}
      <section className="locus-detail__hero-card">
        <div className="locus-detail__score-banner">
          <div className="locus-detail__score-group">
            <span className="locus-detail__score-num" data-feature="match-score">
              {area.matchScore}
            </span>
            <div className="locus-detail__score-label">
              <span className="locus-detail__score-title">Overall Match Score</span>
              <span className="locus-detail__score-sub">
                Based on {formatCompleteness(area.dataCompleteness)} of verified data
              </span>
            </div>
          </div>

          <ProvenanceBadge
            source="heuristic"
            confidence={area.confidence}
            note="Calibrated multi-criteria utility formula"
          />
        </div>

        <p className="locus-detail__explanation" data-feature="explanation-text">
          {area.explanation}
        </p>
      </section>

      {/* 3. TRANSPARENT SCORE CRITERIA TABLE */}
      <section className="locus-detail__section" data-feature="score-table">
        <div className="locus-detail__section-header">
          <h2 className="locus-detail__section-title">Transparent Score Breakdown</h2>
          <p className="locus-detail__section-desc">
            Every criterion displays assigned points, effective weight, raw physical metric, and provenance source.
            Missing criteria attenuate influence rather than substituting assumptions.
          </p>
        </div>

        <div className="locus-detail__table-wrap">
          <table className="locus-detail__table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Points / Max</th>
                <th>Effective Weight</th>
                <th>Raw Metric</th>
                <th>Provenance & Notes</th>
              </tr>
            </thead>
            <tbody>
              {area.scoreBreakdown.map((row) => (
                <tr key={row.name} data-feature="criterion-row">
                  <td>
                    <strong>{row.name.toUpperCase()}</strong>
                  </td>
                  <td>
                    {row.points} / {row.maxPoints}
                  </td>
                  <td>{row.effectiveWeight.toFixed(1)}%</td>
                  <td>
                    {row.raw.value !== null && row.raw.value !== undefined
                      ? String(row.raw.value)
                      : "Not available"}
                  </td>
                  <td>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <ProvenanceBadge
                        source={row.raw.source}
                        confidence={row.raw.confidence}
                        note={row.raw.note}
                      />
                      {row.raw.note && (
                        <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>{row.raw.note}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. COMMUTE BREAKDOWN */}
      <section className="locus-detail__section" data-feature="commute-breakdown">
        <div className="locus-detail__section-header">
          <h2 className="locus-detail__section-title">Commute Time Analysis</h2>
          <p className="locus-detail__section-desc">
            Free-flow routing calculated via OpenStreetMap road network. Peak estimates derived via calibrated congestion model.
          </p>
        </div>

        <div className="locus-detail__grid">
          {area.commutes.map((c) => (
            <div key={c.destinationId} className="locus-commute-card" data-feature="commute-card">
              <h3 className="locus-commute-card__label">{c.destinationLabel}</h3>

              <div className="locus-commute-card__row">
                <span>Peak Estimate:</span>
                <span className="locus-commute-card__val">
                  {formatCommute(c.peakEstimateMin.value)}
                </span>
                <ProvenanceBadge
                  source={c.peakEstimateMin.source}
                  confidence={c.peakEstimateMin.confidence}
                  note={c.peakEstimateMin.note}
                />
              </div>

              <div className="locus-commute-card__row">
                <span>Free-Flow Road:</span>
                <span className="locus-commute-card__val">
                  {formatCommute(c.freeFlowMin.value)}
                </span>
                <ProvenanceBadge
                  source={c.freeFlowMin.source}
                  confidence={c.freeFlowMin.confidence}
                  note={c.freeFlowMin.note}
                />
              </div>

              <div className="locus-commute-card__footer">
                Route distance: <strong>{c.distanceKm.value} km</strong> · Mode: <strong>{c.mode}</strong>
                {c.exceedsMax && (
                  <span style={{ color: "var(--danger)", marginLeft: "8px", fontWeight: "bold" }}>
                    (Exceeds Max Commute)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. MEASURED AMENITIES & POINTS OF INTEREST */}
      <section className="locus-detail__section" data-feature="amenity-grid">
        <div className="locus-detail__section-header">
          <h2 className="locus-detail__section-title">Measured Local Amenities & Nearby POIs</h2>
          <p className="locus-detail__section-desc">
            Direct counts of tagged OpenStreetMap physical elements within exact centroid query buffers.
            Walking times estimated at 5 km/h standard pedestrian pace.
          </p>
        </div>

        <div className="locus-detail__grid">
          {/* Grocery */}
          <div className="locus-amenity-card" data-feature="amenity-count-card">
            <span className="locus-amenity-card__title">
              Groceries & Daily Essentials ({method.radii.grocery}m · ~10 min walk)
            </span>
            <span className="locus-amenity-card__count">
              {area.amenities.grocery.value !== null ? area.amenities.grocery.value : "None mapped"}
            </span>
            <ProvenanceBadge
              source={area.amenities.grocery.source}
              confidence={area.amenities.grocery.confidence}
              note={area.amenities.grocery.note}
            />
          </div>

          {/* Dining */}
          <div className="locus-amenity-card" data-feature="amenity-count-card">
            <span className="locus-amenity-card__title">
              Cafes & Restaurants ({method.radii.food}m · ~10 min walk)
            </span>
            <span className="locus-amenity-card__count">
              {area.amenities.food.value !== null ? area.amenities.food.value : "None mapped"}
            </span>
            <ProvenanceBadge
              source={area.amenities.food.source}
              confidence={area.amenities.food.confidence}
              note={area.amenities.food.note}
            />
          </div>

          {/* Healthcare */}
          <div className="locus-amenity-card" data-feature="amenity-count-card">
            <span className="locus-amenity-card__title">
              Healthcare & Clinics ({method.radii.healthcare}m · ~18 min walk)
            </span>
            <span className="locus-amenity-card__count">
              {area.amenities.healthcare.value !== null ? area.amenities.healthcare.value : "None mapped"}
            </span>
            <ProvenanceBadge
              source={area.amenities.healthcare.source}
              confidence={area.amenities.healthcare.confidence}
              note={area.amenities.healthcare.note}
            />
          </div>

          {/* Education */}
          <div className="locus-amenity-card" data-feature="amenity-count-card">
            <span className="locus-amenity-card__title">
              Schools & Education ({method.radii.education}m · ~18 min walk)
            </span>
            <span className="locus-amenity-card__count">
              {area.amenities.education.value !== null ? area.amenities.education.value : "None mapped"}
            </span>
            <ProvenanceBadge
              source={area.amenities.education.source}
              confidence={area.amenities.education.confidence}
              note={area.amenities.education.note}
            />
          </div>

          {/* Parks & Leisure */}
          <div className="locus-amenity-card" data-feature="amenity-count-card">
            <span className="locus-amenity-card__title">
              Parks & Open Leisure ({method.radii.leisure}m · ~18 min walk)
            </span>
            <span className="locus-amenity-card__count">
              {area.amenities.leisure.value !== null ? area.amenities.leisure.value : "None mapped"}
            </span>
            <ProvenanceBadge
              source={area.amenities.leisure.source}
              confidence={area.amenities.leisure.confidence}
              note={area.amenities.leisure.note}
            />
          </div>

          {/* Transit Stops */}
          <div className="locus-amenity-card" data-feature="amenity-count-card">
            <span className="locus-amenity-card__title">
              Transit Stops (Bus {method.radii.busStop}m · Rail {method.radii.railStation}m)
            </span>
            <div style={{ display: "flex", gap: "16px", margin: "4px 0" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--ink-muted)", display: "block" }}>Bus Stops</span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", fontWeight: 600 }}>
                  {area.amenities.busStops.value ?? "None"}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--ink-muted)", display: "block" }}>Rail / Metro</span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", fontWeight: 600 }}>
                  {area.amenities.railStations.value ?? "None"}
                </span>
              </div>
            </div>
            <ProvenanceBadge
              source={area.amenities.busStops.source}
              confidence={area.amenities.busStops.confidence}
            />
          </div>
        </div>
      </section>

      {/* 6. RENT BAND & USER OVERRIDE */}
      <section className="locus-detail__section" data-feature="rent-panel">
        <div className="locus-detail__section-header">
          <h2 className="locus-detail__section-title">Estimated Rent Band & User Correction</h2>
          <p className="locus-detail__section-desc">
            Estimated market tier-band from city calibration. Enter your verified rent to promote confidence to high (user-verified).
          </p>
        </div>

        <div className="locus-rent-override">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)", display: "block" }}>
                Estimated Market Band (Heuristic Tier)
              </span>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--ink)" }}>
                {formatRentBand(area.rentBand.value)}
              </span>
            </div>
            <ProvenanceBadge
              source={area.rentBand.source}
              confidence={area.rentBand.confidence}
              note={area.rentBand.note}
            />
          </div>

          <div className="locus-rent-override__form">
            <label htmlFor="rent-override-input" style={{ fontSize: "var(--text-xs)", fontWeight: 500, width: "100%" }}>
              Know the real rent here? Enter custom monthly rent (₹/mo):
            </label>
            <input
              id="rent-override-input"
              data-feature="rent-override-input"
              type="number"
              className="locus-rent-override__input"
              placeholder="e.g. 35000"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-feature="save-rent-btn"
              onClick={handleSaveRentOverride}
            >
              Save Rent Override
            </Button>
            {overrideSuccess && (
              <span style={{ color: "var(--ok)", fontSize: "var(--text-xs)", fontWeight: 600 }}>
                ✓ Saved & Rescored!
              </span>
            )}
          </div>
        </div>
      </section>

      {/* 7. SAFETY INFRASTRUCTURE PANEL */}
      <section className="locus-detail__section" data-feature="safety-panel">
        <div className="locus-detail__section-header">
          <h2 className="locus-detail__section-title">Safety Infrastructure Indicator</h2>
          <p className="locus-safety-disclaimer" data-feature="safety-disclaimer">
            Disclaimer: This is an OSM infrastructure indicator based on physical features, not police crime data.
          </p>
        </div>

        <div className="locus-safety-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)", display: "block" }}>
                Physical Infrastructure Score
              </span>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-xl)", fontWeight: 600, color: "var(--ink)" }}>
                {area.safetyIndicator.value !== null ? `${area.safetyIndicator.value} / 10` : "Insufficient data"}
              </span>
            </div>
            <ProvenanceBadge
              source={area.safetyIndicator.source}
              confidence={area.safetyIndicator.confidence}
              note={area.safetyIndicator.note}
            />
          </div>

          <ul className="locus-safety-list">
            <li>Police stations within 1500m: <strong>{area.safetyDetails.policeCount.value ?? "0 mapped"}</strong></li>
            <li>Lit road segments tagged in OSM: <strong>{area.safetyDetails.litRoadsCount.value ?? "Untagged in sector"}</strong></li>
            <li>Surveillance & CCTV camera nodes: <strong>{area.safetyDetails.surveillanceCount.value ?? "0"}</strong></li>
            <li>OSM Sector Note: <em>{area.safetyDetails.coverageNote}</em></li>
          </ul>
        </div>
      </section>

      {/* 8. INTERACTIVE MAP PLACEHOLDER */}
      <section data-feature="map-placeholder" className="locus-detail__section" style={{ minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div>
          <span style={{ display: "block", fontSize: "2rem", marginBottom: "8px" }}>🗺</span>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "var(--text-base)", fontWeight: 600, display: "block" }}>
            Interactive Boundary & Routing Map
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)" }}>
            Centroid: {area.lat.toFixed(4)}, {area.lon.toFixed(4)} ({area.osmType}/{area.id})
          </span>
        </div>
      </section>

      {/* 9. PORTAL OUTBOUND LINKS */}
      <section className="locus-detail__section" data-feature="portal-links">
        <div className="locus-detail__section-header">
          <h2 className="locus-detail__section-title">Verified Rental Portal Listings</h2>
          <p className="locus-detail__section-desc">
            Direct search queries constructed for leading rental portals, with universal web search fallback.
          </p>
        </div>

        <div className="locus-portal-links">
          {portals.map((p, idx) => (
            <a
              key={idx}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              data-feature="portal-link-btn"
              className="locus-portal-btn"
            >
              <span>{p.portal}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
