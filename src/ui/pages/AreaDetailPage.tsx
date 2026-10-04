import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { AreaDetail } from "@engine";
import { getEngine } from "@engine";
import { ProvenanceBadge } from "../components/ProvenanceBadge";

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
    return () => { active = false; };
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
      setTimeout(() => setOverrideSuccess(false), 2000);
    }
  };

  if (loading) {
    return (
      <main data-feature="area-detail-screen" data-state="loading" className="box">
        <p>Loading area details for {decodedId}...</p>
      </main>
    );
  }

  if (!area) {
    return (
      <main data-feature="area-detail-screen" data-state="error" className="box">
        <h2>Area Not Found</h2>
        <p>No area record found with ID "{decodedId}".</p>
        <button data-feature="back-btn" onClick={() => navigate(-1)}>
          &larr; Go Back
        </button>
      </main>
    );
  }

  const portals = engine.portals(area);
  const method = engine.method();

  const isSparse = area.dataCompleteness < 0.6;
  const screenState = isSparse ? "sparse-data" : "ready";

  return (
    <main data-feature="area-detail-screen" data-state={screenState} className="box">
      {/* 1. HEADER */}
      <header className="row" data-feature="area-header" style={{ justifyContent: "space-between" }}>
        <div>
          <button data-feature="back-btn" onClick={() => navigate(-1)} style={{ marginRight: "12px" }}>
            &larr; Back to Results
          </button>
          <h1 style={{ display: "inline" }}>{area.name}</h1>
          <span style={{ fontSize: "12px", color: "#666", marginLeft: "8px" }}>
            OSM ID: {area.id} ({area.osmType})
          </span>
        </div>

        <button data-feature="save-toggle-btn" onClick={handleToggleSave}>
          {isSaved ? "★ Saved in Shortlist" : "☆ Save Locality"}
        </button>
      </header>

      {/* 2. MATCH SCORE & EXPLANATION */}
      <section className="box" style={{ marginTop: "16px" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 data-feature="match-score" style={{ margin: "0 0 4px" }}>
              {area.matchScore} / 100 Match Score
            </h2>
            <ProvenanceBadge
              source="heuristic"
              confidence={area.confidence}
              note="Weighted multi-criteria utility score"
            />
            <span style={{ fontSize: "12px", marginLeft: "8px" }}>
              Data completeness: {Math.round(area.dataCompleteness * 100)}%
            </span>
          </div>
        </div>

        <p data-feature="explanation-text" style={{ fontStyle: "italic", margin: "12px 0 4px" }}>
          {area.explanation}
        </p>
      </section>

      {/* 3. SCORE BREAKDOWN TABLE */}
      <section className="box" data-feature="score-table" style={{ marginTop: "16px" }}>
        <h3>Honest Score Breakdown</h3>
        <small>Every factor displays raw data, assigned points, and provenance badge.</small>
        <table>
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
                <td><strong>{row.name.toUpperCase()}</strong></td>
                <td>{row.points} / {row.maxPoints}</td>
                <td>{row.effectiveWeight.toFixed(1)}%</td>
                <td>
                  {row.raw.value !== null && row.raw.value !== undefined
                    ? String(row.raw.value)
                    : "Not available"}
                </td>
                <td>
                  <ProvenanceBadge
                    source={row.raw.source}
                    confidence={row.raw.confidence}
                    note={row.raw.note}
                  />
                  {row.raw.note && <span style={{ fontSize: "11px", marginLeft: "4px" }}>{row.raw.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 4. COMMUTE BREAKDOWN */}
      <section className="box" data-feature="commute-breakdown" style={{ marginTop: "16px" }}>
        <h3>Commute Times per Destination</h3>
        <p style={{ fontSize: "12px" }}>
          Free-flow duration measured via OpenStreetMap road network. Peak estimates calculated via calibrated congestion model.
        </p>

        <div className="grid">
          {area.commutes.map((c) => (
            <div key={c.destinationId} className="box" data-feature="commute-card">
              <h4>{c.destinationLabel}</h4>
              <p>
                <strong>Peak Estimate:</strong> {c.peakEstimateMin.value ?? "N/A"} min
                <ProvenanceBadge
                  source={c.peakEstimateMin.source}
                  confidence={c.peakEstimateMin.confidence}
                  note={c.peakEstimateMin.note}
                />
              </p>
              <p>
                <strong>Free-Flow:</strong> {c.freeFlowMin.value ?? "N/A"} min
                <ProvenanceBadge
                  source={c.freeFlowMin.source}
                  confidence={c.freeFlowMin.confidence}
                  note={c.freeFlowMin.note}
                />
              </p>
              <p style={{ fontSize: "11px" }}>
                Route distance: {c.distanceKm.value} km | Mode: {c.mode}
                {c.exceedsMax && <span style={{ color: "#b00", marginLeft: "6px" }}>(Exceeds Max Commute)</span>}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. AMENITY COUNTS WITH EXACT RADII */}
      <section className="box" data-feature="amenity-grid" style={{ marginTop: "16px" }}>
        <h3>Measured Amenity Counts</h3>
        <p style={{ fontSize: "12px" }}>
          Counted in real-time from OpenStreetMap nodes, ways, and relations. Quoted radii strictly match query radii.
        </p>

        <div className="grid">
          <div className="box" data-feature="amenity-count-card">
            <h4>Groceries & Daily ({method.radii.grocery}m radius)</h4>
            <p style={{ fontSize: "18px", fontWeight: "bold" }}>
              {area.amenities.grocery.value !== null ? area.amenities.grocery.value : "None mapped"}
            </p>
            <ProvenanceBadge source={area.amenities.grocery.source} confidence={area.amenities.grocery.confidence} note={area.amenities.grocery.note} />
          </div>

          <div className="box" data-feature="amenity-count-card">
            <h4>Food & Dining ({method.radii.food}m radius)</h4>
            <p style={{ fontSize: "18px", fontWeight: "bold" }}>
              {area.amenities.food.value !== null ? area.amenities.food.value : "None mapped"}
            </p>
            <ProvenanceBadge source={area.amenities.food.source} confidence={area.amenities.food.confidence} note={area.amenities.food.note} />
          </div>

          <div className="box" data-feature="amenity-count-card">
            <h4>Healthcare ({method.radii.healthcare}m radius)</h4>
            <p style={{ fontSize: "18px", fontWeight: "bold" }}>
              {area.amenities.healthcare.value !== null ? area.amenities.healthcare.value : "None mapped"}
            </p>
            <ProvenanceBadge source={area.amenities.healthcare.source} confidence={area.amenities.healthcare.confidence} note={area.amenities.healthcare.note} />
          </div>

          <div className="box" data-feature="amenity-count-card">
            <h4>Education ({method.radii.education}m radius)</h4>
            <p style={{ fontSize: "18px", fontWeight: "bold" }}>
              {area.amenities.education.value !== null ? area.amenities.education.value : "None mapped"}
            </p>
            <ProvenanceBadge source={area.amenities.education.source} confidence={area.amenities.education.confidence} note={area.amenities.education.note} />
          </div>

          <div className="box" data-feature="amenity-count-card">
            <h4>Parks & Leisure ({method.radii.leisure}m radius)</h4>
            <p style={{ fontSize: "18px", fontWeight: "bold" }}>
              {area.amenities.leisure.value !== null ? area.amenities.leisure.value : "None mapped"}
            </p>
            <ProvenanceBadge source={area.amenities.leisure.source} confidence={area.amenities.leisure.confidence} note={area.amenities.leisure.note} />
          </div>

          <div className="box" data-feature="amenity-count-card">
            <h4>Bus Stops ({method.radii.busStop}m) & Rail ({method.radii.railStation}m)</h4>
            <p style={{ fontSize: "14px" }}>
              Bus: <strong>{area.amenities.busStops.value ?? "None"}</strong> | Rail/Metro: <strong>{area.amenities.railStations.value ?? "None"}</strong>
            </p>
            <ProvenanceBadge source={area.amenities.busStops.source} confidence={area.amenities.busStops.confidence} />
          </div>
        </div>
      </section>

      {/* 6. RENT BAND & USER OVERRIDE */}
      <section className="box" data-feature="rent-panel" style={{ marginTop: "16px" }}>
        <h3>Estimated Rent Band & User Correction</h3>
        <p>
          <strong>Estimated Market Band:</strong>{" "}
          {area.rentBand.value
            ? `₹${area.rentBand.value.low.toLocaleString("en-IN")} – ₹${area.rentBand.value.high.toLocaleString("en-IN")} / month`
            : "Unavailable"}
          <ProvenanceBadge
            source={area.rentBand.source}
            confidence={area.rentBand.confidence}
            note={area.rentBand.note}
          />
        </p>

        <div style={{ marginTop: "12px", border: "1px solid #ccc", padding: "10px" }}>
          <label htmlFor="rent-override-input">Know the actual rent here? Enter custom rent (₹/mo):</label>
          <div className="row" style={{ marginTop: "4px" }}>
            <input
              id="rent-override-input"
              data-feature="rent-override-input"
              type="number"
              placeholder="e.g. 35000"
              value={overrideInput}
              onChange={(e) => setOverrideInput(e.target.value)}
            />
            <button data-feature="save-rent-btn" onClick={handleSaveRentOverride}>
              Save Rent Override
            </button>
            {overrideSuccess && <span style={{ color: "green" }}>✓ Saved & Rescored!</span>}
          </div>
          <small>Setting an override promotes rent confidence to <strong>high (user-verified)</strong>.</small>
        </div>
      </section>

      {/* 7. SAFETY INFRASTRUCTURE PANEL */}
      <section className="box" data-feature="safety-panel" style={{ marginTop: "16px" }}>
        <h3>Safety Infrastructure Indicator</h3>
        <p data-feature="safety-disclaimer" style={{ fontStyle: "italic", color: "#666" }}>
          Disclaimer: This is an OSM infrastructure indicator based on physical features, not police crime data.
        </p>
        <p>
          Indicator Score:{" "}
          <strong>
            {area.safetyIndicator.value !== null ? `${area.safetyIndicator.value} / 10` : "Insufficient data"}
          </strong>
          <ProvenanceBadge
            source={area.safetyIndicator.source}
            confidence={area.safetyIndicator.confidence}
            note={area.safetyIndicator.note}
          />
        </p>
        <ul style={{ fontSize: "12px" }}>
          <li>Police stations in 1500m: {area.safetyDetails.policeCount.value ?? "0 mapped"}</li>
          <li>Lit road segments tagged: {area.safetyDetails.litRoadsCount.value ?? "Untagged in OSM"}</li>
          <li>Surveillance / CCTV nodes: {area.safetyDetails.surveillanceCount.value ?? "0"}</li>
          <li>Note: {area.safetyDetails.coverageNote}</li>
        </ul>
      </section>

      {/* 8. MAP PLACEHOLDER */}
      <section data-feature="map-placeholder" className="map-box" style={{ marginTop: "16px" }}>
        <strong>[MAP VIEW FOR {area.name.toUpperCase()} PLACEHOLDER]</strong>
      </section>

      {/* 9. PORTAL LINKS */}
      <section className="box" data-feature="portal-links" style={{ marginTop: "16px" }}>
        <h3>Verified Rental Portal Listings</h3>
        <p style={{ fontSize: "12px" }}>
          External portal links generated via verified patterns and universal search fallback:
        </p>
        <div className="row">
          {portals.map((p, idx) => (
            <a
              key={idx}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              data-feature="portal-link-btn"
              style={{
                display: "inline-block",
                padding: "6px 12px",
                border: "1px solid #333",
                background: "#eee",
                textDecoration: "none",
                color: "#000",
                fontSize: "13px"
              }}
            >
              {p.portal} &nearr;
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
