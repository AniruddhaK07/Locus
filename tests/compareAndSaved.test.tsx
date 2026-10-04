import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { getEngine } from "../src/engine";
import { ComparePage } from "../src/ui/pages/ComparePage";
import { SavedPage } from "../src/ui/pages/SavedPage";

describe("Phase U4: Compare & Saved Screens", () => {
  const engine = getEngine();

  it("renders ComparePage empty state when no area IDs are provided", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/compare"]}>
        <Routes>
          <Route path="/compare" element={<ComparePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('data-feature="compare-screen"');
    expect(html).toContain('data-state="empty"');
    expect(html).toContain("No neighbourhoods selected for comparison");
  });

  it("renders ComparePage initial loading state during SSR when IDs are provided", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/compare?ids=node/429918282,relation/19883335"]}>
        <Routes>
          <Route path="/compare" element={<ComparePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('data-feature="compare-screen"');
    expect(html).toContain('data-state="loading"');
  });

  it("verifies engine comparison matrix produces rows and winners for 2 candidate areas", async () => {
    engine.setScenario("normal");
    const result = await engine.compare(["node/429918282", "relation/19883335"]);

    expect(result.areas).toHaveLength(2);
    expect(result.rows.length).toBeGreaterThan(4);

    const matchRow = result.rows.find((r) => r.metric === "matchScore");
    expect(matchRow).toBeDefined();
    expect(matchRow?.winnerId).toBeDefined();
  });

  it("renders SavedPage empty state when no areas are saved", () => {
    // Clear saved
    for (const id of engine.saved.list()) {
      engine.saved.toggle(id);
    }

    const html = renderToString(
      <MemoryRouter initialEntries={["/saved"]}>
        <Routes>
          <Route path="/saved" element={<SavedPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('data-feature="saved-screen"');
    expect(html).toContain('data-state="empty"');
    expect(html).toContain("saved any neighbourhoods yet");
  });

  it("reactively tracks saved additions and removals in engine store", () => {
    const id = "node/429918282";
    expect(engine.saved.has(id)).toBe(false);

    engine.saved.toggle(id);
    expect(engine.saved.has(id)).toBe(true);

    engine.saved.toggle(id);
    expect(engine.saved.has(id)).toBe(false);
  });
});
