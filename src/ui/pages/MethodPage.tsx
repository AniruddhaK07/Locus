import { useState } from "react";
import { getEngine } from "@engine";
import { ProvenanceBadge } from "../primitives/ProvenanceBadge";
import { Card } from "../primitives/Card";

export function MethodPage() {
  const engine = getEngine();
  const method = engine.method();

  // Interactive Weight Preview State
  const [activeFocus, setActiveFocus] = useState<"balanced" | "commute" | "budget" | "amenities" | "safety">("balanced");

  // Calculate dynamic simulator weights
  const simulatedWeights = (() => {
    const base = { ...method.weights };
    if (activeFocus !== "balanced" && base[activeFocus] !== undefined) {
      base[activeFocus] = Math.round(base[activeFocus] * 1.3); // Apply priority boost
    }
    const total = Object.values(base).reduce((sum, w) => sum + w, 0);
    const normalized: Record<string, number> = {};
    for (const [k, v] of Object.entries(base)) {
      normalized[k] = Math.round((v / total) * 100);
    }
    return normalized;
  })();

  const paletteColors: Record<string, string> = {
    commute: "var(--ink)",
    rent: "var(--line-strong)",
    amenities: "var(--soft)",
    safety: "var(--accent)",
    transit: "var(--line)",
  };

  return (
    <main data-feature="method-screen" data-state="ready" className="locus-method">
      {/* 1. Header */}
      <header className="locus-method__header">
        <h1 className="locus-method__title">Methodology, Formulas & Limitations</h1>
        <p className="locus-method__lead">
          All calculations, weights, and confidence adjustments are public and transparent.
          Locus uses zero black-box AI models for neighbourhood scoring.
        </p>
      </header>

      {/* 2. Interactive Simulator */}
      <section className="locus-method__section">
        <div className="locus-method__section-header">
          <h2 className="locus-method__section-title">Interactive Weighting Simulator</h2>
          <p className="locus-method__section-desc">
            See how selecting a priority focus dynamically shifts the utility weighting across criteria.
          </p>
        </div>

        <div className="locus-simulator">
          <div className="locus-simulator__controls">
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>Simulate Priority:</span>
            {(["balanced", "commute", "budget", "amenities", "safety"] as const).map((focus) => (
              <button
                key={focus}
                type="button"
                className={`locus-simulator__btn ${activeFocus === focus ? "locus-simulator__btn--active" : ""}`}
                onClick={() => setActiveFocus(focus)}
              >
                {focus.charAt(0).toUpperCase() + focus.slice(1)}
              </button>
            ))}
          </div>

          <div className="locus-simulator__preview-bar" aria-label="Dynamic Weight Distribution">
            {Object.entries(simulatedWeights).map(([k, pct]) => (
              <div
                key={k}
                className="locus-simulator__segment"
                style={{
                  width: `${pct}%`,
                  backgroundColor: paletteColors[k] || "var(--soft)",
                  color: k === "commute" || k === "rent" ? "var(--bg)" : "var(--ink)",
                }}
                title={`${k.toUpperCase()}: ${pct}%`}
              >
                {pct >= 10 ? `${k} ${pct}%` : ""}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "var(--text-xs)" }}>
            {Object.entries(simulatedWeights).map(([k, pct]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    backgroundColor: paletteColors[k] || "var(--line)",
                  }}
                />
                <span style={{ textTransform: "capitalize", fontWeight: 500 }}>{k}:</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Scoring Weights Table */}
      <section className="locus-method__section">
        <div className="locus-method__section-header">
          <h2 className="locus-method__section-title">Base Scoring Weights & Confidence Attenuation</h2>
          <p className="locus-method__section-desc">
            Base weights total 100%. When data has lower confidence, its effective weight is attenuated by the factor shown below.
          </p>
        </div>

        <div className="locus-detail__table-wrap">
          <table className="locus-detail__table" data-feature="weights-table">
            <thead>
              <tr>
                <th>Criterion</th>
                <th>Base Weight</th>
                <th>High Confidence (1.0×)</th>
                <th>Medium Confidence (0.7×)</th>
                <th>Low Confidence (0.35×)</th>
                <th>None (0.0×)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(method.weights).map(([name, weight]) => (
                <tr key={name}>
                  <td>
                    <strong>{name.toUpperCase()}</strong>
                  </td>
                  <td>{weight}%</td>
                  <td>{(weight * method.confidenceFactors.high).toFixed(1)}%</td>
                  <td>{(weight * method.confidenceFactors.medium).toFixed(1)}%</td>
                  <td>{(weight * method.confidenceFactors.low).toFixed(1)}%</td>
                  <td>0.0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "var(--text-xs)", color: "var(--ink-muted)", margin: 0, fontStyle: "italic" }}>
          <strong>Renormalization Principle:</strong> Missing criteria (0.0× factor or explicit nulls) reduce criterion influence rather than substituting fake defaults. Scores always renormalize over present, verified data.
        </p>
      </section>

      {/* 4. Radii Query Standards */}
      <section className="locus-method__section">
        <div className="locus-method__section-header">
          <h2 className="locus-method__section-title">Query Radii & Pedestrian Accessibility</h2>
          <p className="locus-method__section-desc">
            In accordance with the zero-fabrication principle, all radii shown below are identical to the Overpass query buffers.
          </p>
        </div>

        <div className="locus-detail__table-wrap">
          <table className="locus-detail__table" data-feature="radii-table">
            <thead>
              <tr>
                <th>Amenity Category</th>
                <th>Radius (Meters)</th>
                <th>Approx. Walk Time</th>
                <th>Target Physical Elements</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(method.radii).map(([category, radius]) => {
                const walkMin = Math.round((radius / 1000) * 12); // ~5 km/h walking speed
                return (
                  <tr key={category}>
                    <td style={{ textTransform: "capitalize", fontWeight: 600 }}>{category}</td>
                    <td>{radius} m</td>
                    <td>~{walkMin} min walk</td>
                    <td>Nodes, ways, and relations within {radius}m centroid buffer</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Routing Profiles */}
      <section className="locus-method__section">
        <div className="locus-method__section-header">
          <h2 className="locus-method__section-title">Routing Engines & Profile Verification</h2>
          <p className="locus-method__section-desc">
            Multi-modal routing profiles serviced via open infrastructure. Heuristic models are explicitly declared.
          </p>
        </div>

        <div className="locus-detail__table-wrap">
          <table className="locus-detail__table" data-feature="routing-profiles-table">
            <thead>
              <tr>
                <th>Transport Mode</th>
                <th>Status</th>
                <th>Provider Host</th>
                <th>Engine Type</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(method.routingProfiles).map(([mode, info]) => (
                <tr key={mode}>
                  <td>
                    <strong>{mode.toUpperCase()}</strong>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: info.available ? "var(--soft)" : "rgba(168, 74, 54, 0.15)",
                        color: info.available ? "var(--ink)" : "var(--danger)",
                      }}
                    >
                      {info.available ? "AVAILABLE" : "UNAVAILABLE"}
                    </span>
                  </td>
                  <td>{info.provider}</td>
                  <td>{info.isHeuristic ? "Heuristic Estimate" : "Direct Graph Routing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Provenance & Confidence Legend */}
      <section className="locus-method__section" data-feature="confidence-legend">
        <div className="locus-method__section-header">
          <h2 className="locus-method__section-title">Provenance Badges & Confidence Hierarchy</h2>
          <p className="locus-method__section-desc">
            Every metric displayed in Locus carries an honest provenance badge communicating origin and reliability.
          </p>
        </div>

        <div className="locus-method__legend-grid">
          <Card className="locus-method__legend-card">
            <ProvenanceBadge source="osm" confidence="high" />
            <p className="locus-method__legend-text">
              Direct physical tag count or boundary from OpenStreetMap with high local tag density.
            </p>
          </Card>

          <Card className="locus-method__legend-card">
            <ProvenanceBadge source="routing" confidence="high" />
            <p className="locus-method__legend-text">
              Direct road-network route distance and free-flow duration from OSRM graph.
            </p>
          </Card>

          <Card className="locus-method__legend-card">
            <ProvenanceBadge source="heuristic" confidence="low" />
            <p className="locus-method__legend-text">
              Calibrated formula (e.g. peak traffic congestion multiplier or rental tier scaling).
            </p>
          </Card>

          <Card className="locus-method__legend-card">
            <ProvenanceBadge source="user" confidence="high" />
            <p className="locus-method__legend-text">
              Direct user input or override (e.g. user-supplied verified actual monthly rent).
            </p>
          </Card>

          <Card className="locus-method__legend-card">
            <ProvenanceBadge source="unavailable" confidence="none" />
            <p className="locus-method__legend-text">
              Data absent or unmapped; treated strictly as null and excluded from scoring bias.
            </p>
          </Card>
        </div>
      </section>

      {/* 7. Limitations & Caveats */}
      <section className="locus-method__section">
        <div className="locus-method__section-header">
          <h2 className="locus-method__section-title">Honest Limitations & Caveats</h2>
          <p className="locus-method__section-desc">
            Public infrastructure and crowdsourced data have known boundaries. We document every limitation unvarnished.
          </p>
        </div>

        <ul className="locus-limitations-list" data-feature="limitations-list">
          {method.limitations.map((lim, idx) => (
            <li key={idx}>{lim}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
