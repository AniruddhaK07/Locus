import { Link } from "react-router-dom";
import type { MockScenario } from "@engine";
import { getEngine } from "@engine";

export function DevMapPage() {
  const engine = getEngine();

  const scenarios: { key: MockScenario; label: string; desc: string }[] = [
    { key: "normal", label: "Normal", desc: "12 discovered localities in Bengaluru, dense metrics, quick response" },
    { key: "slow", label: "Slow Stepped", desc: "Extended delays on every pipeline stage to inspect progress bars" },
    { key: "partial", label: "Partial Results", desc: "Pipeline stops halfway with 3 areas and a documented warning" },
    { key: "empty", label: "Empty Set", desc: "Zero candidates matching filters, testing empty state UI" },
    { key: "error", label: "Fatal Error", desc: "Pipeline service unreachable, testing error boundary display" },
    { key: "sparse-data", label: "Sparse Data", desc: "Real Indian fringe areas with missing tags, nulls, and low completeness" }
  ];

  const routes = [
    { path: "/", name: "Home Screen", desc: "Value statement, Start CTA, Resume last search" },
    { path: "/plan", name: "Preferences Stepper", desc: "3-step stepper: city & workplace typeahead, transit, budget, priorities" },
    { path: "/results", name: "Search Results", desc: "Progress panel, sort/filter controls, map placeholder, area cards, sticky compare" },
    { path: "/area/node%2F429918282", name: "Area Detail (Koramangala)", desc: "Deep breakdown: score table, commute range, amenity radii, rent override, safety indicator, portals" },
    { path: "/compare?ids=node%2F429918282,relation%2F19883335", name: "Side-by-Side Compare", desc: "Compare Koramangala vs Indiranagar with per-row winner marker" },
    { path: "/saved", name: "Saved Localities", desc: "Shortlisted areas list with compare-selected trigger" },
    { path: "/method", name: "How It Works (Methodology)", desc: "Public weights, radii, routing availability, confidence legend, limitations" },
    { path: "/_map", name: "Dev Route Map & Catalog", desc: "This directory of all screens, feature IDs, and scenarios" },
    { path: "/primitives", name: "Primitives Showcase", desc: "Dev-only showcase of all Phase U0 design primitives and states" }
  ];

  const features = [
    "app-title", "value-statement", "start-btn", "resume-search-btn",
    "step-1-panel", "city-input", "city-suggestions", "city-select-btn", "city-chip",
    "workplace-input", "workplace-suggestions", "workplace-select-btn", "workplace-chip",
    "step-2-panel", "transport-select", "max-commute-input", "add-dest-btn", "dest-row", "remove-dest-btn",
    "step-3-panel", "budget-min-input", "budget-max-input", "household-select", "priority-select",
    "step-back-btn", "step-next-btn", "submit-search-btn", "validation-error",
    "prefs-summary", "edit-prefs-btn", "copy-share-btn", "pipeline-progress-panel", "stage-item",
    "sort-select", "view-toggle", "filter-panel", "filter-max-commute", "filter-min-match", "filter-hide-low-conf",
    "map-placeholder", "area-list", "area-card", "area-rank", "match-score", "key-facts",
    "compare-checkbox", "save-toggle-btn", "details-link", "load-more-btn", "compare-sticky-bar",
    "clear-compare-btn", "compare-btn", "area-header", "explanation-text", "score-table", "criterion-row",
    "commute-breakdown", "commute-card", "amenity-grid", "amenity-count-card", "rent-panel",
    "rent-override-input", "save-rent-btn", "safety-panel", "safety-disclaimer", "portal-links",
    "portal-link-btn", "comparison-table", "metric-row", "winner-marker", "remove-area-btn",
    "saved-list", "saved-item-card", "remove-saved-btn", "compare-selected-btn", "weights-table",
    "radii-table", "routing-profiles-table", "confidence-legend", "limitations-list", "scenario-switcher"
  ];

  const handleActivateScenario = (sc: MockScenario) => {
    engine.setScenario(sc);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locus_mock_scenario", sc);
      window.dispatchEvent(new CustomEvent("locus_scenario_change", { detail: sc }));
    }
  };

  return (
    <main data-feature="dev-map-screen" data-state="ready" className="box">
      <header>
        <h2>Developer Catalog & Wireframe Table of Contents (/_map)</h2>
        <p>
          This screen lists all routes, interactive feature IDs, and engine scenario toggles.
          Use this to inspect and design every state without touching the engine logic.
        </p>
      </header>

      {/* 1. SCENARIO TOGGLES */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Engine Scenario Switchers (Mock Mode)</h3>
        <p style={{ fontSize: "12px" }}>Click any button to switch the global engine scenario and jump to Results:</p>
        <div className="grid">
          {scenarios.map((s) => (
            <div key={s.key} className="box">
              <strong>{s.label}</strong>
              <p style={{ fontSize: "11px", margin: "4px 0" }}>{s.desc}</p>
              <div className="row">
                <button
                  type="button"
                  onClick={() => handleActivateScenario(s.key)}
                >
                  Activate
                </button>
                <Link to="/results" onClick={() => handleActivateScenario(s.key)}>
                  [Activate & Go to /results]
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. ROUTE DIRECTORY */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Complete Route Directory</h3>
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Screen Name</th>
              <th>Description & Key Controls</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((r) => (
              <tr key={r.path}>
                <td>
                  <Link to={r.path}><strong>{r.path}</strong></Link>
                </td>
                <td>{r.name}</td>
                <td>{r.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 3. FEATURE ID REGISTRY */}
      <section className="box" style={{ marginTop: "16px" }}>
        <h3>Stable Feature ID Registry ({features.length} elements)</h3>
        <p style={{ fontSize: "12px" }}>
          Every interactive control and data container has <code>data-feature="&lt;id&gt;"</code>.
        </p>
        <div className="row" style={{ gap: "6px" }}>
          {features.map((f) => (
            <span key={f} className="badge">
              {f}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
