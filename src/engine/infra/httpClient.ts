import type { ResponseCache } from "./cache";
import type { RateLimitQueue } from "./queue";
import { recordRequestTiming, type RequestTimingRecord, type TimingErrorCause } from "./timing";

function detectService(url: string, name?: string): RequestTimingRecord["service"] {
  const combined = `${url} ${name || ""}`.toLowerCase();
  if (combined.includes("overpass")) return "Overpass";
  if (combined.includes("nominatim")) return "Nominatim";
  if (combined.includes("osrm") || combined.includes("routed-") || combined.includes("project-osrm")) return "OSRM";
  if (combined.includes("photon")) return "Photon";
  return "Other";
}

export function getClusterKey(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const parts = host.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return host;
  } catch {
    return urlStr;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  cacheKey?: string;
  cacheTtlMs?: number;
  queue?: RateLimitQueue;
  maxRetries?: number;
  retryBaseDelayMs?: number;
}

export interface MirrorConfig {
  name: string;
  urls: string[]; // e.g. ["https://overpass-api.de/api", "https://z.overpass-api.de/api", "https://lz4.overpass-api.de/api"]
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public url: string,
    public bodySnippet?: string,
    public retryAfterSeconds?: number
  ) {
    super(`HTTP ${status} (${statusText}) for ${url}: ${bodySnippet || ""}`);
    this.name = "HttpError";
  }
}

export class HttpClient {
  private cache?: ResponseCache;
  private mirrorPointers: Map<string, number> = new Map();

  constructor(opts?: { cache?: ResponseCache }) {
    this.cache = opts?.cache;
  }

  /**
   * Performs an HTTP request with caching, queueing, timeout, backoff, and mirror failover.
   */
  async request<T>(
    target: string | MirrorConfig,
    endpointPath: string,
    opts: RequestOptions = {}
  ): Promise<T> {
    const {
      method = "GET",
      headers = {},
      body,
      timeoutMs = 15000,
      signal,
      cacheKey,
      cacheTtlMs,
      queue,
      maxRetries = 2,
      retryBaseDelayMs = 500
    } = opts;

    // 1. Check cache first
    if (cacheKey && this.cache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null && cached !== undefined) {
        recordRequestTiming({
          service: detectService(endpointPath, typeof target !== "string" ? target.name : target),
          url: endpointPath,
          mirror: "CACHE",
          status: 200,
          retries: 0,
          queueWaitMs: 0,
          networkMs: 0,
          durationMs: 0,
          backoffMs: 0,
          cached: true
        });
        return cached;
      }
    }

    // Resolve URL / Mirrors
    const isMirrorConfig = typeof target !== "string";
    const mirrorName = isMirrorConfig ? target.name : target;
    const baseUrls = isMirrorConfig ? target.urls : [target];

    // Ensure we start with current healthy mirror pointer
    const currentPointer = this.mirrorPointers.get(mirrorName) ?? 0;

    const executeWithMirror = async (mirrorIndex: number): Promise<T> => {
      const baseUrl = baseUrls[mirrorIndex % baseUrls.length];
      let fullUrl = baseUrl;
      if (endpointPath) {
        fullUrl = endpointPath.startsWith("/")
          ? `${baseUrl}${endpointPath}`
          : `${baseUrl}/${endpointPath}`;
      }

      // Helper for a single network attempt
      const attemptFetch = async (
        attempt: number,
        queueWaitMs: number = 0,
        backoffAccumMs: number = 0
      ): Promise<T> => {
        // Create combined abort controller
        const timeoutController = new AbortController();
        let isTimedOut = false;
        const timeoutId = setTimeout(() => {
          isTimedOut = true;
          timeoutController.abort(new DOMException("Request timed out", "TimeoutError"));
        }, timeoutMs);

        const onAbort = () => {
          timeoutController.abort(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort);

        const netStart = performance.now();
        try {
          const res = await fetch(fullUrl, {
            method,
            headers: {
              ...headers
            },
            body,
            signal: timeoutController.signal
          });

          const netMs = Math.round(performance.now() - netStart);

          // Check for retryable HTTP errors (429 Too Many Requests or 5xx Server Errors)
          if (res.status === 429 || (res.status >= 500 && res.status <= 504)) {
            const errorText = await res.text().catch(() => "");
            const retryAfterHeader = res.headers.get("retry-after");
            const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
            const cause: TimingErrorCause = res.status === 429 ? "MIRROR_REJECTION" : "HTTP_5XX";
            recordRequestTiming({
              service: detectService(fullUrl, mirrorName),
              url: fullUrl,
              mirror: baseUrl,
              status: res.status,
              errorCause: cause,
              errorMessage: errorText.slice(0, 100),
              retries: attempt,
              queueWaitMs: Math.round(queueWaitMs),
              networkMs: netMs,
              durationMs: Math.round(queueWaitMs + netMs + backoffAccumMs),
              backoffMs: backoffAccumMs
            });

            if (res.status === 429) {
              const delay = !isNaN(Number(retryAfterSec)) && (retryAfterSec ?? 0) > 0
                ? Math.min((retryAfterSec ?? 0) * 1000, 10000)
                : 2000;
              if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, delay));
                return attemptFetch(attempt + 1, queueWaitMs, backoffAccumMs + delay);
              }
              throw new HttpError(res.status, res.statusText, fullUrl, errorText.slice(0, 200), retryAfterSec);
            }

            if (attempt < maxRetries) {
              // Exponential backoff with jitter (0.8 to 1.2)
              const jitter = 0.8 + Math.random() * 0.4;
              const delay = Math.round(retryBaseDelayMs * Math.pow(2, attempt) * jitter);
              await new Promise((r) => setTimeout(r, delay));
              return attemptFetch(attempt + 1, queueWaitMs, backoffAccumMs + delay);
            }
            throw new HttpError(res.status, res.statusText, fullUrl, errorText.slice(0, 200));
          }

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            const cause: TimingErrorCause = res.status >= 500 ? "HTTP_5XX" : "MIRROR_REJECTION";
            recordRequestTiming({
              service: detectService(fullUrl, mirrorName),
              url: fullUrl,
              mirror: baseUrl,
              status: res.status,
              errorCause: cause,
              errorMessage: errorText.slice(0, 100),
              retries: attempt,
              queueWaitMs: Math.round(queueWaitMs),
              networkMs: netMs,
              durationMs: Math.round(queueWaitMs + netMs + backoffAccumMs),
              backoffMs: backoffAccumMs
            });
            throw new HttpError(res.status, res.statusText, fullUrl, errorText.slice(0, 200));
          }

          const contentType = res.headers.get("content-type") || "";
          let parsedData: T;
          if (contentType.includes("application/json")) {
            parsedData = (await res.json()) as T;
          } else {
            parsedData = (await res.text()) as unknown as T;
          }

          if (signal?.aborted || timeoutController.signal.aborted) {
            throw new DOMException("Aborted", "AbortError");
          }

          recordRequestTiming({
            service: detectService(fullUrl, mirrorName),
            url: fullUrl,
            mirror: baseUrl,
            status: res.status,
            retries: attempt,
            queueWaitMs: Math.round(queueWaitMs),
            networkMs: netMs,
            durationMs: Math.round(queueWaitMs + netMs + backoffAccumMs),
            backoffMs: backoffAccumMs
          });

          // Cache on success
          if (cacheKey && this.cache) {
            await this.cache.set(cacheKey, parsedData, cacheTtlMs);
          }

          // Remember this mirror worked
          if (isMirrorConfig) {
            this.mirrorPointers.set(mirrorName, mirrorIndex % baseUrls.length);
          }

          return parsedData;
        } catch (err) {
          const netMs = Math.round(performance.now() - netStart);
          if (!(err instanceof HttpError)) {
            let cause: TimingErrorCause = "OTHER";
            const errMsg = String((err as Error)?.message || err);
            const errCode = (err as Record<string, unknown>)?.code || (err as { cause?: Record<string, unknown> })?.cause?.code;
            if (isTimedOut || (err instanceof DOMException && err.name === "AbortError" && !signal?.aborted)) {
              cause = "CLIENT_ABORT";
            } else if (errMsg.includes("Connect Timeout") || errCode === "UND_ERR_CONNECT_TIMEOUT") {
              cause = "CONNECT_TIMEOUT";
            } else if (errCode === "ECONNRESET" || errMsg.includes("ECONNRESET") || errCode === "ECONNREFUSED" || errMsg.includes("ECONNREFUSED")) {
              cause = "CONNECTION_RESET";
            }
            recordRequestTiming({
              service: detectService(fullUrl, mirrorName),
              url: fullUrl,
              mirror: baseUrl,
              status: isTimedOut ? "TIMEOUT" : "ERROR",
              errorCause: cause,
              errorMessage: errMsg,
              retries: attempt,
              queueWaitMs: Math.round(queueWaitMs),
              networkMs: netMs,
              durationMs: Math.round(queueWaitMs + netMs + backoffAccumMs),
              backoffMs: backoffAccumMs
            });
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onAbort);
        }
      };

      // Wrap in rate-limit queue if specified
      if (queue) {
        return queue.enqueue((qWait) => attemptFetch(0, qWait), signal);
      }
      return attemptFetch(0);
    };

    // Try primary mirror, fail over to backup mirrors on error
    const visitedClusters = new Set<string>();
    let lastError: unknown;
    for (let i = 0; i < baseUrls.length; i++) {
      const mirrorIdx = (currentPointer + i) % baseUrls.length;
      const mirrorUrl = baseUrls[mirrorIdx];
      const clusterKey = getClusterKey(mirrorUrl);

      // Do NOT fail over within the same cluster on 429
      if (visitedClusters.has(clusterKey)) {
        continue;
      }

      try {
        return await executeWithMirror(mirrorIdx);
      } catch (err: unknown) {
        lastError = err;
        // If aborted by user, do not fail over to other mirrors
        if (err instanceof DOMException && err.name === "AbortError" && signal?.aborted) {
          throw err;
        }
        // If mirror returned 429, mark this cluster so we do not retry inside the same cluster
        if (err instanceof HttpError && err.status === 429) {
          visitedClusters.add(clusterKey);
        }
        // If mirror returned 4xx other than 429, it's likely a bad request, not mirror failure
        if (err instanceof HttpError && err.status >= 400 && err.status < 500 && err.status !== 429) {
          throw err;
        }
        // Otherwise, rotate to next mirror
      }
    }

    throw lastError;
  }

  async get<T>(target: string | MirrorConfig, opts?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(target, "", { ...opts, method: "GET" });
  }

  async post<T>(
    target: string | MirrorConfig,
    endpointPathOrBody?: string,
    bodyOrOpts?: string | Omit<RequestOptions, "method">,
    opts?: Omit<RequestOptions, "method" | "body">
  ): Promise<T> {
    // Overload 1: post(target, body, opts)
    if (typeof bodyOrOpts === "object" || bodyOrOpts === undefined) {
      const body = endpointPathOrBody;
      const options = bodyOrOpts as Omit<RequestOptions, "method"> | undefined;
      return this.request<T>(target, "", { ...options, method: "POST", body });
    }
    // Overload 2: post(target, endpointPath, body, opts)
    return this.request<T>(target, endpointPathOrBody ?? "", {
      ...opts,
      method: "POST",
      body: bodyOrOpts
    });
  }
}

