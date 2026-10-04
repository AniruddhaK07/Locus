import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Polyfill window & localStorage for Node-based SSR testing
beforeAll(() => {
  if (typeof globalThis.window === "undefined") {
    const listeners: Record<string, ((ev: unknown) => void)[]> = {};
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };

    (globalThis as unknown as Record<string, unknown>).window = {
      addEventListener: (event: string, cb: (ev: unknown) => void) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      },
      removeEventListener: (event: string, cb: (ev: unknown) => void) => {
        listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
      },
      dispatchEvent: (event: { type: string; detail?: unknown }) => {
        (listeners[event.type] || []).forEach((fn) => fn(event));
        return true;
      },
      localStorage: mockStorage,
    };
    (globalThis as unknown as Record<string, unknown>).localStorage = mockStorage;
    (globalThis as unknown as Record<string, unknown>).CustomEvent = class CustomEvent {
      type: string;
      detail: unknown;
      constructor(type: string, opts?: { detail?: unknown }) {
        this.type = type;
        this.detail = opts?.detail;
      }
    };
  }
});

import { HomePage } from "../src/ui/pages/HomePage";
import { MethodPage } from "../src/ui/pages/MethodPage";
import { DevMapPage } from "../src/ui/pages/DevMapPage";
import { PrimitivesPage } from "../src/ui/pages/PrimitivesPage";
import { ScenarioSwitcher } from "../src/ui/components/ScenarioSwitcher";

function readComponentSource(fileName: string): string {
  const filePath = path.resolve(__dirname, "../src/ui/components", fileName);
  return fs.readFileSync(filePath, "utf-8");
}

function readPageSource(fileName: string): string {
  const filePath = path.resolve(__dirname, "../src/ui/pages", fileName);
  return fs.readFileSync(filePath, "utf-8");
}

function assertFeaturesInSource(source: string, features: string[], context: string) {
  const missing: string[] = [];
  for (const feat of features) {
    if (!source.includes(`data-feature="${feat}"`) && !source.includes(`"${feat}"`)) {
      missing.push(feat);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[FeatureGuard] ${context} is missing required data-feature IDs:\n  - ${missing.join("\n  - ")}`
    );
  }
}

describe("UI Contract Feature ID Guard (check:features)", () => {
  it("verifies Screen 1: Home (/) features in render and source", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>
    );
    expect(html).toContain('data-feature="home-screen"');
    expect(html).toContain('data-feature="start-btn"');

    const src = readPageSource("HomePage.tsx");
    assertFeaturesInSource(src, ["home-screen", "app-title", "value-statement", "start-btn", "resume-search-btn"], "Screen 1: Home");
  });

  it("verifies Screen 2: Plan (/plan) features across all 3 steps", () => {
    const src = [
      readPageSource("PlanPage.tsx"),
      readComponentSource("Combobox.tsx"),
    ].join("\n");
    assertFeaturesInSource(
      src,
      [
        "plan-screen",
        "step-1-panel",
        "city-input",
        "city-suggestions",
        "city-select-btn",
        "city-chip",
        "workplace-input",
        "workplace-suggestions",
        "workplace-select-btn",
        "workplace-chip",
        "step-2-panel",
        "transport-select",
        "max-commute-input",
        "add-dest-btn",
        "dest-row",
        "remove-dest-btn",
        "step-3-panel",
        "budget-min-input",
        "budget-max-input",
        "household-select",
        "priority-select",
        "step-back-btn",
        "step-next-btn",
        "submit-search-btn",
        "validation-error",
      ],
      "Screen 2: Plan"
    );
  });

  it("verifies Screen 3: Results (/results) controls and card features", () => {
    const src = [
      readPageSource("ResultsPage.tsx"),
      readComponentSource("AreaCard.tsx"),
      readComponentSource("PipelineProgress.tsx"),
      readComponentSource("RefineDisclosure.tsx"),
      readComponentSource("CompareStickyBar.tsx"),
    ].join("\n");
    assertFeaturesInSource(
      src,
      [
        "results-screen",
        "prefs-summary",
        "edit-prefs-btn",
        "copy-share-btn",
        "pipeline-progress-panel",
        "stage-item",
        "sort-select",
        "view-toggle",
        "filter-panel",
        "filter-max-commute",
        "filter-min-match",
        "filter-hide-low-conf",
        "map-placeholder",
        "area-list",
        "area-card",
        "area-rank",
        "match-score",
        "key-facts",
        "compare-checkbox",
        "save-toggle-btn",
        "details-link",
        "load-more-btn",
        "compare-sticky-bar",
        "clear-compare-btn",
        "compare-btn",
      ],
      "Screen 3: Results"
    );
  });

  it("verifies Screen 4: Area Detail (/area/:id) data breakdown features", () => {
    const src = readPageSource("AreaDetailPage.tsx");
    assertFeaturesInSource(
      src,
      [
        "area-detail-screen",
        "area-header",
        "save-toggle-btn",
        "score-table",
        "criterion-row",
        "commute-breakdown",
        "commute-card",
        "amenity-grid",
        "amenity-count-card",
        "rent-panel",
        "rent-override-input",
        "save-rent-btn",
        "safety-panel",
        "safety-disclaimer",
        "portal-links",
        "portal-link-btn",
      ],
      "Screen 4: Area Detail"
    );
  });

  it("verifies Screen 5: Compare (/compare) table and winner features", () => {
    const src = readPageSource("ComparePage.tsx");
    assertFeaturesInSource(
      src,
      [
        "compare-screen",
        "comparison-table",
        "metric-row",
        "winner-marker",
        "remove-area-btn",
      ],
      "Screen 5: Compare"
    );
  });

  it("verifies Screen 6: Saved (/saved) list and compare triggers", () => {
    const src = readPageSource("SavedPage.tsx");
    assertFeaturesInSource(
      src,
      [
        "saved-screen",
        "saved-list",
        "saved-item-card",
        "remove-saved-btn",
        "compare-selected-btn",
      ],
      "Screen 6: Saved"
    );
  });

  it("verifies Screen 7: Methodology (/method) tables and legend", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/method"]}>
        <MethodPage />
      </MemoryRouter>
    );
    expect(html).toContain('data-feature="method-screen"');

    const src = readPageSource("MethodPage.tsx");
    assertFeaturesInSource(
      src,
      [
        "method-screen",
        "weights-table",
        "radii-table",
        "routing-profiles-table",
        "confidence-legend",
        "limitations-list",
      ],
      "Screen 7: Method"
    );
  });

  it("verifies Screen 8: Developer Route Map (/_map) & ScenarioSwitcher features", () => {
    const htmlMap = renderToString(
      <MemoryRouter initialEntries={["/_map"]}>
        <DevMapPage />
      </MemoryRouter>
    );
    expect(htmlMap).toContain('data-feature="dev-map-screen"');

    const htmlSwitcher = renderToString(<ScenarioSwitcher />);
    expect(htmlSwitcher).toContain('data-feature="scenario-switcher"');
  });

  it("verifies Dev Primitives Showcase (/primitives)", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/primitives"]}>
        <PrimitivesPage />
      </MemoryRouter>
    );
    expect(html).toContain('data-feature="primitives-screen"');
    expect(html).toContain('data-feature="mode-banner"');
    expect(html).toContain('data-feature="provenance-badge"');
  });

  it("verifies Brand Features in Header and Footer (brand-logo, team-badge)", () => {
    const headerSrc = readComponentSource("Header.tsx");
    assertFeaturesInSource(headerSrc, ["brand-logo", "nav-home", "theme-toggle"], "Header Brand");

    const footerSrc = readComponentSource("Footer.tsx");
    assertFeaturesInSource(footerSrc, ["team-badge"], "Footer Team");
  });
});
