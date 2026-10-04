/**
 * Locus Engine — Public API Contract
 *
 * This is the ONLY public export surface for the presentation layer (src/ui/).
 * All types, methods, and engine instances must be consumed through this module.
 */

import type { Engine, EngineOptions } from "./domain/types";
import { MockEngine } from "./mock/mockEngine";

export * from "./domain/types";
export * from "./domain/selection";

export const ENGINE_NAME = "Locus Engine";
export const ENGINE_VERSION = "0.1.0";

/**
 * Creates an instance of the Locus Engine.
 *
 * In Phase 1 skeleton mode, creates a MockEngine supporting scenarios:
 * 'normal', 'slow', 'partial', 'empty', 'error', 'sparse-data'.
 */
export function createEngine(opts: EngineOptions = { mode: "mock" }): Engine {
  if (opts.mode === "mock") {
    return new MockEngine(opts);
  }
  // In Phase 1, fallback to MockEngine for skeleton testing
  return new MockEngine(opts);
}

// Global default engine instance for UI convenience
let defaultEngine: MockEngine | null = null;

export function getEngine(opts?: EngineOptions): MockEngine {
  if (!defaultEngine) {
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    const mode = metaEnv?.VITE_ENGINE_MODE === "live" ? "live" : "mock";
    defaultEngine = new MockEngine({ mode, ...opts });
  }
  return defaultEngine;
}
