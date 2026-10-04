import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  HttpClient,
  HttpError,
  MemoryStorageAdapter,
  RateLimitQueue,
  ResponseCache
} from "../src/engine/infra";

describe("Infrastructure Layer Tests", () => {
  describe("MemoryStorageAdapter & ResponseCache TTL", () => {
    it("stores and retrieves items correctly", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.set("key1", { foo: "bar" });
      const val = await storage.get<{ foo: string }>("key1");
      expect(val).toEqual({ foo: "bar" });
    });

    it("expires items when TTL passes", async () => {
      vi.useFakeTimers();
      const storage = new MemoryStorageAdapter();
      await storage.set("temp", "value", 1000); // 1 sec TTL

      expect(await storage.get("temp")).toBe("value");

      vi.advanceTimersByTime(1500);

      expect(await storage.get("temp")).toBeNull();
      vi.useRealTimers();
    });

    it("ResponseCache returns cached value without re-querying", async () => {
      const cache = new ResponseCache();
      await cache.set("cache_k", { hello: "world" });
      const res = await cache.get<{ hello: string }>("cache_k");
      expect(res?.hello).toBe("world");
    });
  });

  describe("RateLimitQueue", () => {
    it("enforces FIFO execution order", async () => {
      const queue = new RateLimitQueue({ concurrency: 1, minSpacingMs: 0 });
      const order: number[] = [];

      const p1 = queue.enqueue(async () => { order.push(1); return 1; });
      const p2 = queue.enqueue(async () => { order.push(2); return 2; });
      const p3 = queue.enqueue(async () => { order.push(3); return 3; });

      await Promise.all([p1, p2, p3]);
      expect(order).toEqual([1, 2, 3]);
    });

    it("enforces concurrency limit", async () => {
      const queue = new RateLimitQueue({ concurrency: 2, minSpacingMs: 0 });
      let currentActive = 0;
      let maxActiveObserved = 0;

      const makeTask = () => async () => {
        currentActive++;
        maxActiveObserved = Math.max(maxActiveObserved, currentActive);
        await new Promise((r) => setTimeout(r, 50));
        currentActive--;
        return true;
      };

      const tasks = [
        queue.enqueue(makeTask()),
        queue.enqueue(makeTask()),
        queue.enqueue(makeTask()),
        queue.enqueue(makeTask())
      ];

      await Promise.all(tasks);
      expect(maxActiveObserved).toBeLessThanOrEqual(2);
    });

    it("enforces minSpacingMs between dispatches", async () => {
      const queue = new RateLimitQueue({ concurrency: 1, minSpacingMs: 80 });
      const dispatchTimestamps: number[] = [];

      const makeTask = () => async () => {
        dispatchTimestamps.push(Date.now());
        return true;
      };

      await Promise.all([
        queue.enqueue(makeTask()),
        queue.enqueue(makeTask()),
        queue.enqueue(makeTask())
      ]);

      expect(dispatchTimestamps.length).toBe(3);
      const gap1 = dispatchTimestamps[1] - dispatchTimestamps[0];
      const gap2 = dispatchTimestamps[2] - dispatchTimestamps[1];
      expect(gap1).toBeGreaterThanOrEqual(70);
      expect(gap2).toBeGreaterThanOrEqual(70);
    });

    it("aborts queued tasks before execution if signal is aborted", async () => {
      const queue = new RateLimitQueue({ concurrency: 1, minSpacingMs: 100 });
      const controller = new AbortController();

      // First task occupies the queue
      const p1 = queue.enqueue(async () => {
        await new Promise((r) => setTimeout(r, 60));
        return "first";
      });

      // Second task is waiting in queue
      const p2 = queue.enqueue(async () => "second", controller.signal);

      // Abort while p2 is waiting
      controller.abort();

      await expect(p2).rejects.toThrow();
      expect(await p1).toBe("first");
    });
  });

  describe("HttpClient", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("retrieves from cache when cacheKey hits", async () => {
      const cache = new ResponseCache();
      await cache.set("cached_url", { hit: true });

      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const client = new HttpClient({ cache });
      const data = await client.request<{ hit: boolean }>("https://example.com", "/test", {
        cacheKey: "cached_url"
      });

      expect(data).toEqual({ hit: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("retries on 429 with exponential backoff and succeeds", async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response("Too Many Requests", { status: 429, statusText: "Too Many Requests" });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      });

      const client = new HttpClient();
      const res = await client.request<{ success: boolean }>("https://example.com", "/api", {
        maxRetries: 2,
        retryBaseDelayMs: 20
      });

      expect(res.success).toBe(true);
      expect(callCount).toBe(2);
    });

    it("fails over to backup mirror when primary mirror returns 500", async () => {
      const mirrorUrls = ["https://mirror1.org/api", "https://mirror2.org/api"];
      const calledUrls: string[] = [];

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        calledUrls.push(url);
        if (url.includes("mirror1.org")) {
          return new Response("Server error", { status: 500, statusText: "Internal Error" });
        }
        return new Response(JSON.stringify({ mirror: "mirror2" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      });

      const client = new HttpClient();
      const res = await client.request<{ mirror: string }>(
        { name: "test-mirrors", urls: mirrorUrls },
        "/interpreter",
        { maxRetries: 0 }
      );

      expect(res.mirror).toBe("mirror2");
      expect(calledUrls.some((u) => u.includes("mirror1.org"))).toBe(true);
      expect(calledUrls.some((u) => u.includes("mirror2.org"))).toBe(true);
    });

    it("propagates caller abort signal and rejects", async () => {
      const controller = new AbortController();
      globalThis.fetch = vi.fn().mockImplementation((_url, opts) => {
        const signal = opts?.signal;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve(new Response(JSON.stringify({ done: true }), { status: 200 }));
          }, 200);

          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

      const client = new HttpClient();
      const reqPromise = client.request("https://example.com", "/slow", {
        signal: controller.signal
      });

      setTimeout(() => controller.abort(), 20);

      await expect(reqPromise).rejects.toThrow();
    });

    it("throws HttpError when non-retryable 404 occurs", async () => {
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
      });

      const client = new HttpClient();
      await expect(
        client.request("https://example.com", "/nonexistent", { maxRetries: 1 })
      ).rejects.toThrow(HttpError);
    });
  });
});
