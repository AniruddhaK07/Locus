/**
 * Locus Engine — Timing & Diagnostics Instrumentation
 *
 * Lightweight, dev-only, zero-overhead-when-off diagnostic tracker.
 * Measures per-request: service, duration, HTTP status, retries,
 * queue wait time vs network time, and which mirror answered.
 */

export interface RequestTimingRecord {
  service: "Nominatim" | "Overpass" | "OSRM" | "Photon" | "Other";
  url: string;
  mirror: string;
  status: number | "TIMEOUT" | "ERROR";
  retries: number;
  queueWaitMs: number;
  networkMs: number;
  durationMs: number;
  backoffMs: number;
  cached?: boolean;
}

export interface SearchTimingReport {
  searchId: string;
  totalDurationMs: number;
  stageTimings: Record<string, number>;
  requests: RequestTimingRecord[];
  summary: {
    totalRequests: number;
    statusCounts: Record<string, number>;
    timeouts: number;
    errors: number;
    totalQueueWaitMs: number;
    totalNetworkMs: number;
    totalBackoffMs: number;
  };
}

declare global {
  var __LOCUS_TIMING__: boolean | undefined;
  var __LOCUS_ACTIVE_REPORT__: SearchTimingReport | null | undefined;
}

export function isTimingEnabled(): boolean {
  if (typeof globalThis !== "undefined" && globalThis.__LOCUS_TIMING__ !== undefined) {
    return globalThis.__LOCUS_TIMING__;
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env.LOCUS_TIMING === "true" || process.env.DEBUG_TIMING === "true";
  }
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("locus_timing") === "true";
  }
  return false;
}

export function enableTiming(enable: boolean = true): void {
  if (typeof globalThis !== "undefined") {
    globalThis.__LOCUS_TIMING__ = enable;
  }
}

export function startSearchTiming(searchId: string): SearchTimingReport {
  const report: SearchTimingReport = {
    searchId,
    totalDurationMs: 0,
    stageTimings: {},
    requests: [],
    summary: {
      totalRequests: 0,
      statusCounts: {},
      timeouts: 0,
      errors: 0,
      totalQueueWaitMs: 0,
      totalNetworkMs: 0,
      totalBackoffMs: 0
    }
  };
  if (typeof globalThis !== "undefined") {
    globalThis.__LOCUS_ACTIVE_REPORT__ = report;
  }
  return report;
}

export function getActiveSearchTiming(): SearchTimingReport | null {
  if (typeof globalThis !== "undefined") {
    return globalThis.__LOCUS_ACTIVE_REPORT__ ?? null;
  }
  return null;
}

export function recordStageTiming(stage: string, durationMs: number): void {
  const report = getActiveSearchTiming();
  if (report) {
    report.stageTimings[stage] = durationMs;
  }
}

export function recordRequestTiming(record: RequestTimingRecord): void {
  const report = getActiveSearchTiming();
  if (report) {
    report.requests.push(record);
    report.summary.totalRequests++;
    report.summary.totalQueueWaitMs += record.queueWaitMs;
    report.summary.totalNetworkMs += record.networkMs;
    report.summary.totalBackoffMs += record.backoffMs;

    const statusKey = String(record.status);
    report.summary.statusCounts[statusKey] = (report.summary.statusCounts[statusKey] || 0) + 1;
    if (record.status === "TIMEOUT") report.summary.timeouts++;
    if (record.status === "ERROR" || (typeof record.status === "number" && record.status >= 400 && record.status !== 429)) {
      report.summary.errors++;
    }
  }

  if (isTimingEnabled()) {
    const queueStr = `${record.queueWaitMs}ms`.padStart(7, " ");
    const netStr = `${record.networkMs}ms`.padStart(7, " ");
    const statusStr = String(record.status).padEnd(7, " ");
    const retriesStr = record.retries > 0 ? ` [retries=${record.retries}, backoff=${record.backoffMs}ms]` : "";
    console.log(
      `[TIMING] ${record.service.padEnd(10, " ")} | Status: ${statusStr} | Queue: ${queueStr} | Net: ${netStr} | Total: ${record.durationMs}ms | Mirror: ${record.mirror}${retriesStr}`
    );
  }
}

export function endSearchTiming(searchId: string, totalMs: number): SearchTimingReport | null {
  const report = getActiveSearchTiming();
  if (!report || report.searchId !== searchId) return null;

  report.totalDurationMs = totalMs;

  if (isTimingEnabled()) {
    console.log(`\n==================================================================`);
    console.log(`  [SEARCH TIMING REPORT]: ${searchId} (${Math.round(totalMs)}ms total)`);
    console.log(`==================================================================`);
    console.log(`  Stage Breakdown:`);
    for (const [st, ms] of Object.entries(report.stageTimings)) {
      console.log(`    - ${st.padEnd(25, " ")}: ${Math.round(ms)}ms (${((ms / totalMs) * 100).toFixed(1)}%)`);
    }
    console.log(`  Request Summary:`);
    console.log(`    - Total Requests:     ${report.summary.totalRequests}`);
    console.log(`    - Status Codes:       ${JSON.stringify(report.summary.statusCounts)}`);
    console.log(`    - Timeouts:           ${report.summary.timeouts}`);
    console.log(`    - Total Queue Wait:   ${Math.round(report.summary.totalQueueWaitMs)}ms`);
    console.log(`    - Total Network Time: ${Math.round(report.summary.totalNetworkMs)}ms`);
    console.log(`    - Total Backoff Time: ${Math.round(report.summary.totalBackoffMs)}ms`);
    console.log(`==================================================================\n`);
  }

  return report;
}
