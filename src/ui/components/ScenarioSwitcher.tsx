import { useEffect, useState } from "react";
import type { MockScenario } from "@engine";
import { getEngine } from "@engine";

export function ScenarioSwitcher() {
  const engine = getEngine();
  const [scenario, setScenarioState] = useState<MockScenario>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("locus_mock_scenario");
      if (stored) return stored as MockScenario;
    }
    return engine.getScenario();
  });

  useEffect(() => {
    engine.setScenario(scenario);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("locus_mock_scenario", scenario);
    }
  }, [scenario, engine]);

  const handleChange = (newScenario: MockScenario) => {
    setScenarioState(newScenario);
    engine.setScenario(newScenario);
    // Reload or emit event so active screens reflect the scenario
    window.dispatchEvent(new CustomEvent("locus_scenario_change", { detail: newScenario }));
  };

  return (
    <div className="dev-banner" data-feature="scenario-switcher">
      <strong>[DEV SCENARIO SWITCHER]:</strong>
      <label htmlFor="scenario-select">Active Scenario:</label>
      <select
        id="scenario-select"
        value={scenario}
        onChange={(e) => handleChange(e.target.value as MockScenario)}
        data-feature="scenario-select"
      >
        <option value="normal">Normal (12 areas, fast)</option>
        <option value="slow">Slow (stepped progression)</option>
        <option value="partial">Partial (fails halfway)</option>
        <option value="empty">Empty (0 candidates)</option>
        <option value="error">Error (fatal failure)</option>
        <option value="sparse-data">Sparse Data (nulls & low completeness)</option>
      </select>
      <span>| Mode: MOCK</span>
      <a href="/_map" data-feature="map-link">[View Route Index & Catalog]</a>
    </div>
  );
}
