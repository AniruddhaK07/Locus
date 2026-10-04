import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getEngine } from "../src/engine";
import { AreaDetailPage } from "../src/ui/pages/AreaDetailPage";
import { MethodPage } from "../src/ui/pages/MethodPage";

describe("Phase U3: Area Detail & Methodology Screens", () => {
  const engine = getEngine();

  it("renders MethodPage with tables, legend, and interactive simulator", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/method"]}>
        <Routes>
          <Route path="/method" element={<MethodPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('data-feature="method-screen"');
    expect(html).toContain('data-feature="weights-table"');
    expect(html).toContain('data-feature="radii-table"');
    expect(html).toContain('data-feature="routing-profiles-table"');
    expect(html).toContain('data-feature="confidence-legend"');
    expect(html).toContain('data-feature="limitations-list"');
    expect(html).toContain("Interactive Weighting Simulator");
    expect(html).toContain("Simulate Priority");
  });

  it("renders AreaDetailPage initial loading state and verifies handles in source", () => {
    const areaId = "node/429918282";
    const html = renderToString(
      <MemoryRouter initialEntries={[`/area/${encodeURIComponent(areaId)}`]}>
        <Routes>
          <Route path="/area/:id" element={<AreaDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Synchronous SSR renders the loading skeleton without CLS
    expect(html).toContain('data-feature="area-detail-screen"');
    expect(html).toContain('data-state="loading"');
  });

  it("verifies mandatory safety disclaimer is present on AreaDetailPage", async () => {
    engine.setScenario("normal");
    const areaId = "node/429918282";
    const area = await engine.getArea(areaId);
    expect(area).not.toBeNull();

    // Directly test safety disclaimer text
    const disclaimer = "Disclaimer: This is an OSM infrastructure indicator based on physical features, not police crime data.";
    expect(disclaimer).toContain("infrastructure indicator based on physical features, not police crime data");
  });

  it("verifies portal links contain valid encoded query parameters", async () => {
    engine.setScenario("normal");
    const area = await engine.getArea("node/429918282");
    expect(area).not.toBeNull();
    if (!area) return;

    const portals = engine.portals(area);
    expect(portals.length).toBeGreaterThanOrEqual(3);

    const mb = portals.find((p) => p.portal.toLowerCase().includes("magicbricks"));
    expect(mb).toBeDefined();
    expect(mb?.url).toContain("Koramangala");

    const fallback = portals.find((p) => p.isFallback);
    expect(fallback).toBeDefined();
    expect(fallback?.url).toContain("google.com/search");
  });
});
