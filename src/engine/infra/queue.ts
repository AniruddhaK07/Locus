/**
 * Locus Engine — Rate Limiting Queue
 *
 * Enforces strict request concurrency, minimum spacing between dispatches,
 * FIFO order, and AbortSignal cancellation.
 */

export interface QueueOptions {
  concurrency?: number;
  minSpacingMs?: number;
}

interface QueuedItem<T> {
  task: (queueWaitMs: number) => Promise<T>;
  signal?: AbortSignal;
  enqueuedAt: number;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

export class RateLimitQueue {
  private concurrency: number;
  private minSpacingMs: number;
  private runningCount: number = 0;
  private lastDispatchTime: number = 0;
  private queue: Array<QueuedItem<unknown>> = [];
  private scheduleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: QueueOptions = {}) {
    this.concurrency = Math.max(1, opts.concurrency ?? 1);
    this.minSpacingMs = Math.max(0, opts.minSpacingMs ?? 0);
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.runningCount;
  }

  enqueue<T>(task: (queueWaitMs: number) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }

    return new Promise<T>((resolve, reject) => {
      const item: QueuedItem<T> = { task, signal, enqueuedAt: Date.now(), resolve, reject };

      if (signal) {
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          const index = this.queue.indexOf(item as QueuedItem<unknown>);
          if (index !== -1) {
            this.queue.splice(index, 1);
            reject(new DOMException("Aborted", "AbortError"));
          }
        };
        signal.addEventListener("abort", onAbort);
      }

      this.queue.push(item as QueuedItem<unknown>);
      this.pump();
    });
  }

  private pump(): void {
    if (this.runningCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.lastDispatchTime;
    const waitTime = Math.max(0, this.minSpacingMs - elapsed);

    if (waitTime > 0 && !this.scheduleTimer) {
      this.scheduleTimer = setTimeout(() => {
        this.scheduleTimer = null;
        this.pump();
      }, waitTime);
      return;
    }

    if (this.scheduleTimer) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    if (item.signal?.aborted) {
      item.reject(new DOMException("Aborted", "AbortError"));
      this.pump();
      return;
    }

    this.runningCount++;
    this.lastDispatchTime = Date.now();
    const queueWaitMs = Math.max(0, Date.now() - item.enqueuedAt);

    item.task(queueWaitMs)
      .then((val) => item.resolve(val))
      .catch((err) => item.reject(err))
      .finally(() => {
        this.runningCount--;
        this.pump();
      });

    // If concurrency > 1, try pumping another item
    if (this.runningCount < this.concurrency) {
      this.pump();
    }
  }

  clear(): void {
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      item?.reject(new DOMException("Queue cleared", "AbortError"));
    }
  }
}
