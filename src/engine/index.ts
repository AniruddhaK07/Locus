/**
 * Locus Engine — Public API Contract
 *
 * This is the ONLY public export surface for the presentation layer (src/ui/).
 * All types, methods, and engine instances must be consumed through this module.
 */

import type { Engine, EngineOptions, MockScenario } from "./domain/types";
import { MockEngine } from "./mock/mockEngine";
import { LiveEngine } from "./live/liveEngine";
import { SnapshotEngine } from "./snapshot/snapshotEngine";

export * from "./domain/types";
export * from "./domain/selection";
export * from "./scoring/budget";
export * from "./scoring/safety";
export * from "./scoring/household";
export * from "./scoring/matchScore";
export * from "./scoring/explanations";
export * from "./providers/rent";
export * from "./pipeline/searchPipeline";
export * from "./live/liveEngine";
export * from "./snapshot/snapshotEngine";
export * from "./features/compare";
export * from "./features/portals";
export * from "./features/saved";

export const ENGINE_NAME = "Locus Engine";
export const ENGINE_VERSION = "0.1.0";

export type CompatibleEngine = Engine & {
  getScenario(): MockScenario;
  setScenario(s: MockScenario): void;
  mode: "live" | "mock" | "snapshot";
};

/**
 * Creates an instance of the Locus Engine.
 *
 * Supports mode: "mock" (using MockEngine), "live" (using LiveEngine), or "snapshot" (using SnapshotEngine).
 */
export function createEngine(opts: EngineOptions = { mode: "mock" }): CompatibleEngine {
  if (opts.mode === "live") {
    return new LiveEngine(opts);
  }
  if (opts.mode === "snapshot") {
    return new SnapshotEngine(opts);
  }
  return new MockEngine(opts);
}

// Global default engine instance for UI convenience
let defaultEngine: CompatibleEngine | null = null;

/**
 * Resolves the active engine mode adhering strictly to priority:
 * 1. Test runner -> "mock" (always pinned in Vitest)
 * 2. URL search param ?engine=snapshot|live|mock (updates tab sessionStorage)
 * 3. Tab sessionStorage (remembered per browser tab)
 * 4. Environment variable VITE_ENGINE_MODE
 * 5. Default "mock"
 */
export function resolveEngineMode(): "live" | "mock" | "snapshot" {
  const isTest = typeof process !== "undefined" && Boolean(process.env.VITEST);
  if (isTest) {
    return "mock";
  }

  // 1. Check URL search param (?engine=...)
  if (typeof window !== "undefined" && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      const engineParam = params.get("engine");
      if (engineParam === "snapshot" || engineParam === "live" || engineParam === "mock") {
        try {
          sessionStorage.setItem("locus_engine_mode", engineParam);
        } catch {
          // sessionStorage disabled
        }
        return engineParam;
      }
    } catch {
      // Malformed location
    }
  }

  // 2. Check tab sessionStorage (remembered per browser tab)
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("locus_engine_mode");
      if (stored === "snapshot" || stored === "live" || stored === "mock") {
        return stored;
      }
    } catch {
      // sessionStorage disabled
    }
  }

  // 3. Fall back to environment variable or mock
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (metaEnv?.VITE_ENGINE_MODE === "live") {
    return "live";
  }
  if (metaEnv?.VITE_ENGINE_MODE === "snapshot") {
    return "snapshot";
  }

  return "mock";
}

/**
 * Sets engine mode preference for the current browser tab and resets the active engine.
 */
export function setEngineMode(mode: "live" | "mock" | "snapshot"): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("locus_engine_mode", mode);
    } catch {
      // ignore
    }
  }
  resetDefaultEngine();
}

export function getEngine(opts?: EngineOptions): CompatibleEngine {
  if (!defaultEngine) {
    const finalMode = opts?.mode ?? resolveEngineMode();
    defaultEngine = createEngine({ mode: finalMode, ...opts });
  }
  return defaultEngine;
}

export function resetDefaultEngine(): void {
  defaultEngine = null;
}

