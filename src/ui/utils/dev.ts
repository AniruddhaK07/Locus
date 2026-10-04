/**
 * Developer Mode Detector
 *
 * Dev tools (ScenarioSwitcher, /_map, /primitives) are active ONLY:
 * 1. In Vite development mode (`import.meta.env.DEV`), or
 * 2. When the URL contains `?dev=1`, or
 * 3. When `locus_dev=1` is set in localStorage.
 */

export function isDevMode(): boolean {
  if (typeof window === "undefined") return true;
  const metaEnv = (import.meta as unknown as { env?: Record<string, unknown> }).env;
  const isDev = Boolean(metaEnv?.DEV);
  const hasDevParam = window.location.search.includes("dev=1");
  const hasDevStorage = window.localStorage.getItem("locus_dev") === "1";
  return isDev || hasDevParam || hasDevStorage;
}
