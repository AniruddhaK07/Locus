import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { PipelineProgress } from "../src/ui/components/PipelineProgress";
import { ErrorState } from "../src/ui/primitives/ErrorState";
import { ModeBanner } from "../src/ui/primitives/ModeBanner";
import {
  createEngine,
  getEngine,
  resetDefaultEngine,
  resolveEngineMode,
  setEngineMode
} from "../src/engine";

describe("Resilient Live & Explicit Mode Toggling", () => {
  beforeEach(() => {
    resetDefaultEngine();
  });

  describe("Step 2: Honest Error States & Pipeline Progress", () => {
    it("never shows 'Search complete' when stage is error", () => {
      const html = renderToString(
        React.createElement(PipelineProgress, {
          stage: "error",
          progress: 25,
          statusMessage: "Overpass API rejected locality queries (HTTP 406 Not Acceptable)",
          isComplete: true
        })
      );

      expect(html).not.toContain("Search complete");
      expect(html).toContain('data-pipeline-status="error"');
      expect(html).toContain("Search failed");
      expect(html).toContain("Overpass API rejected locality queries");
      expect(html).toContain("25");
    });

    it("shows 'Search complete' only when search successfully completes", () => {
      const html = renderToString(
        React.createElement(PipelineProgress, {
          stage: "done",
          progress: 100,
          statusMessage: "All 12 candidate localities ranked",
          isComplete: true
        })
      );

      expect(html).toContain("Search complete");
      expect(html).toContain("All 12 candidate localities ranked");
      expect(html).toContain('data-pipeline-status="complete"');
      expect(html).toContain("100%");
    });

    it("renders ErrorState with both retry and snapshot demo actions", () => {
      const html = renderToString(
        React.createElement(ErrorState, {
          message: "Overpass API rejected locality queries (HTTP 406 Not Acceptable from deployed origin).",
          onRetry: () => {},
          retryLabel: "Try again",
          retryDataFeature: "retry-btn",
          secondaryAction: {
            label: "Use recorded demo cities",
            onClick: () => {},
            dataFeature: "use-snapshot-btn"
          }
        })
      );

      expect(html).toContain("Overpass API rejected locality queries");
      expect(html).toContain("Try again");
      expect(html).toContain('data-feature="retry-btn"');
      expect(html).toContain("Use recorded demo cities");
      expect(html).toContain('data-feature="use-snapshot-btn"');
    });
  });

  describe("Step 3: Explicit Mode Toggle & ModeBanner", () => {
    it("reports exact engine mode via engine.mode and engine.method().engineMode", () => {
      const mockEngine = createEngine({ mode: "mock" });
      expect(mockEngine.mode).toBe("mock");
      expect(mockEngine.method().engineMode).toBe("mock");

      const snapshotEngine = createEngine({ mode: "snapshot" });
      expect(snapshotEngine.mode).toBe("snapshot");
      expect(snapshotEngine.method().engineMode).toBe("snapshot");

      const liveEngine = createEngine({ mode: "live" });
      expect(liveEngine.mode).toBe("live");
      expect(liveEngine.method().engineMode).toBe("live");
    });

    it("verifies resolveEngineMode, setEngineMode, and getEngine", () => {
      // In test runner, resolveEngineMode always defaults safely to "mock"
      expect(resolveEngineMode()).toBe("mock");

      // getEngine returns the configured engine
      const defaultEng = getEngine();
      expect(defaultEng.mode).toBe("mock");

      // setEngineMode safely executes without error
      setEngineMode("snapshot");
      const snapEng = getEngine({ mode: "snapshot" });
      expect(snapEng.mode).toBe("snapshot");
    });

    it("renders ModeBanner with actual mode and quiet switch link in snapshot mode", () => {
      const htmlSnapshot = renderToString(
        React.createElement(ModeBanner, { mode: "snapshot", capturedDate: "2026-10-04T12:00:00Z" })
      );
      expect(htmlSnapshot).toContain('data-feature="mode-banner"');
      expect(htmlSnapshot).toContain('data-engine-mode="snapshot"');
      expect(htmlSnapshot).toContain("Recorded demo data");
      expect(htmlSnapshot).toContain("Switch to live search");
      expect(htmlSnapshot).toContain('data-feature="switch-live-link"');

      // Live mode remains quiet (returns null)
      const htmlLive = renderToString(
        React.createElement(ModeBanner, { mode: "live" })
      );
      expect(htmlLive).toBe("");
    });

    it("never silently falls back from live to snapshot mode", () => {
      const liveEngine = createEngine({ mode: "live" });
      expect(liveEngine.mode).toBe("live");

      // Verify that liveEngine's method report advertises live routing profiles
      const method = liveEngine.method();
      expect(method.engineMode).toBe("live");
      expect(method.routingProfiles.car.provider).toContain("routing.openstreetmap.de");
      expect(method.routingProfiles.car.available).toBe(true);
    });
  });
});
