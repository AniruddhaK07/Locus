import { getEngine } from "@engine";
import { ProvenanceBadge } from "../components/ProvenanceBadge";

export function MethodPage() {
  const engine = getEngine();
  const method = engine.method();

  return (
    <main data-feature="method-screen" data-state="ready" className="box">
      <header>
        <h2>Methodology, Formulas & Limitations</h2>
        <p>
          All calculations, weights, and confidence adjustments are public and transparent.
          Locus uses zero black-box AI models for scoring.
        </p>
      </header>

      {/* 1. SCORING WEIGHTS */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Scoring Weights & Criteria (Prior Base Weights = 100)</h3>
        <table data-feature="weights-table">
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Base Weight</th>
              <th>High Confidence (1.0x)</th>
              <th>Medium Confidence (0.7x)</th>
              <th>Low Confidence (0.35x)</th>
              <th>None (0.0x)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(method.weights).map(([name, weight]) => (
              <tr key={name}>
                <td><strong>{name.toUpperCase()}</strong></td>
                <td>{weight}%</td>
                <td>{(weight * method.confidenceFactors.high).toFixed(1)}%</td>
                <td>{(weight * method.confidenceFactors.medium).toFixed(1)}%</td>
                <td>{(weight * method.confidenceFactors.low).toFixed(1)}%</td>
                <td>0.0%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <small>
          <strong>Renormalization Rule:</strong> Missing criteria (0.0x factor or null) reduce influence rather than substituting fake defaults. Scores renormalize over present data.
        </small>
      </section>

      {/* 2. RADII QUERY STANDARDS */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Search Radii Standards</h3>
        <p style={{ fontSize: "12px" }}>
          In accordance with the zero-fabrication principle, all radii shown below are identical to the Overpass query boundaries:
        </p>
        <table data-feature="radii-table">
          <thead>
            <tr>
              <th>Amenity Category</th>
              <th>Radius (Meters)</th>
              <th>Target Physical Elements</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(method.radii).map(([category, radius]) => (
              <tr key={category}>
                <td>{category}</td>
                <td>{radius} m</td>
                <td>Nodes, ways, and relations within {radius}m centroid buffer</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 3. ROUTING PROFILES */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Routing Engines & Availability</h3>
        <table data-feature="routing-profiles-table">
          <thead>
            <tr>
              <th>Transport Mode</th>
              <th>Status</th>
              <th>Provider Host</th>
              <th>Heuristic Flag</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(method.routingProfiles).map(([mode, info]) => (
              <tr key={mode}>
                <td><strong>{mode.toUpperCase()}</strong></td>
                <td>
                  <span className={`badge ${info.available ? "winner" : ""}`}>
                    {info.available ? "AVAILABLE" : "UNAVAILABLE"}
                  </span>
                </td>
                <td>{info.provider}</td>
                <td>{info.isHeuristic ? "Heuristic Estimate" : "Direct Routing Profile"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 4. CONFIDENCE LEGEND */}
      <section className="box" data-feature="confidence-legend" style={{ marginTop: "16px" }}>
        <h3>Provenance & Confidence Legend</h3>
        <div className="grid">
          <div className="box">
            <ProvenanceBadge source="osm" confidence="high" />
            <p style={{ fontSize: "12px" }}>Direct physical tag count or boundary from OpenStreetMap with high local tag density.</p>
          </div>
          <div className="box">
            <ProvenanceBadge source="routing" confidence="high" />
            <p style={{ fontSize: "12px" }}>Direct route distance and free-flow duration from OSRM road graph.</p>
          </div>
          <div className="box">
            <ProvenanceBadge source="heuristic" confidence="low" />
            <p style={{ fontSize: "12px" }}>Calibrated mathematical formula (e.g. peak traffic multiplier or tier-band rental scaling).</p>
          </div>
          <div className="box">
            <ProvenanceBadge source="user" confidence="high" />
            <p style={{ fontSize: "12px" }}>Direct user input or override (e.g. user-supplied actual rent).</p>
          </div>
          <div className="box">
            <ProvenanceBadge source="unavailable" confidence="none" />
            <p style={{ fontSize: "12px" }}>Data absent or unmapped; treated strictly as null and excluded from scoring bias.</p>
          </div>
        </div>
      </section>

      {/* 5. LIMITATIONS */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Honest Limitations & Caveats</h3>
        <ul data-feature="limitations-list">
          {method.limitations.map((lim, idx) => (
            <li key={idx} style={{ margin: "6px 0", fontSize: "13px" }}>
              {lim}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
