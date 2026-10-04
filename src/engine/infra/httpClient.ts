import type { ResponseCache } from "./cache";
import type { RateLimitQueue } from "./queue";

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
    public bodySnippet?: string
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
      const fullUrl = endpointPath.startsWith("/")
        ? `${baseUrl}${endpointPath}`
        : `${baseUrl}/${endpointPath}`;

      // Helper for a single network attempt
      const attemptFetch = async (attempt: number): Promise<T> => {
        // Create combined abort controller
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
          timeoutController.abort(new DOMException("Request timed out", "TimeoutError"));
        }, timeoutMs);

        const onAbort = () => {
          timeoutController.abort(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", onAbort);

        try {
          const res = await fetch(fullUrl, {
            method,
            headers: {
              ...headers
            },
            body,
            signal: timeoutController.signal
          });

          // Check for retryable HTTP errors (429 Too Many Requests or 5xx Server Errors)
          if (res.status === 429 || (res.status >= 500 && res.status <= 504)) {
            const errorText = await res.text().catch(() => "");
            if (attempt < maxRetries) {
              // Exponential backoff with jitter (0.8 to 1.2)
              const jitter = 0.8 + Math.random() * 0.4;
              const delay = Math.round(retryBaseDelayMs * Math.pow(2, attempt) * jitter);
              await new Promise((r) => setTimeout(r, delay));
              return attemptFetch(attempt + 1);
            }
            throw new HttpError(res.status, res.statusText, fullUrl, errorText.slice(0, 200));
          }

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
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

          // Cache on success
          if (cacheKey && this.cache) {
            await this.cache.set(cacheKey, parsedData, cacheTtlMs);
          }

          // Remember this mirror worked
          if (isMirrorConfig) {
            this.mirrorPointers.set(mirrorName, mirrorIndex % baseUrls.length);
          }

          return parsedData;
        } finally {
          clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onAbort);
        }
      };

      // Wrap in rate-limit queue if specified
      if (queue) {
        return queue.enqueue(() => attemptFetch(0), signal);
      }
      return attemptFetch(0);
    };

    // Try primary mirror, fail over to backup mirrors on error
    let lastError: unknown;
    for (let i = 0; i < baseUrls.length; i++) {
      const mirrorIdx = (currentPointer + i) % baseUrls.length;
      try {
        return await executeWithMirror(mirrorIdx);
      } catch (err: unknown) {
        lastError = err;
        // If aborted by user, do not fail over to other mirrors
        if (err instanceof DOMException && err.name === "AbortError" && signal?.aborted) {
          throw err;
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
}
