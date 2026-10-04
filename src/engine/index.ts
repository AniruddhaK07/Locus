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

export function getEngine(opts?: EngineOptions): CompatibleEngine {
  if (!defaultEngine) {
    const isTest = typeof process !== "undefined" && Boolean(process.env.VITEST);
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    let mode: "live" | "mock" | "snapshot" = "mock";
    if (!isTest) {
      if (metaEnv?.VITE_ENGINE_MODE === "live") {
        mode = "live";
      } else if (metaEnv?.VITE_ENGINE_MODE === "snapshot") {
        mode = "snapshot";
      }
    }
    const finalMode = opts?.mode ?? mode;
    defaultEngine = createEngine({ mode: finalMode, ...opts });
  }
  return defaultEngine;
}

export function resetDefaultEngine(): void {
  defaultEngine = null;
}
