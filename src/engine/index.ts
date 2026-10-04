/**
 * Locus Engine — Public API Contract
 *
 * This is the ONLY public export surface for the presentation layer (src/ui/).
 * All types, methods, and engine instances must be consumed through this module.
 */

import type { Engine, EngineOptions, MockScenario } from "./domain/types";
import { MockEngine } from "./mock/mockEngine";
import { LiveEngine } from "./live/liveEngine";

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
export * from "./features/compare";
export * from "./features/portals";
export * from "./features/saved";

export const ENGINE_NAME = "Locus Engine";
export const ENGINE_VERSION = "0.1.0";

export type CompatibleEngine = Engine & {
  getScenario(): MockScenario;
  setScenario(s: MockScenario): void;
};

/**
 * Creates an instance of the Locus Engine.
 *
 * Supports mode: "mock" (using MockEngine) or "live" (using LiveEngine).
 */
export function createEngine(opts: EngineOptions = { mode: "mock" }): CompatibleEngine {
  if (opts.mode === "live") {
    return new LiveEngine(opts);
  }
  return new MockEngine(opts);
}

// Global default engine instance for UI convenience
let defaultEngine: CompatibleEngine | null = null;

export function getEngine(opts?: EngineOptions): CompatibleEngine {
  if (!defaultEngine) {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    const mode = opts?.mode ?? (metaEnv?.VITE_ENGINE_MODE === "live" ? "live" : "mock");
    defaultEngine = createEngine({ mode, ...opts });
  }
  return defaultEngine;
}
