import type { StorageAdapter } from "./storage";
import { MemoryStorageAdapter } from "./storage";

export interface CacheOptions {
  storage?: StorageAdapter;
  defaultTtlMs?: number; // e.g. 24 hours = 86_400_000 ms
}

export class ResponseCache {
  private storage: StorageAdapter;
  private defaultTtlMs: number;

  constructor(opts: CacheOptions = {}) {
    this.storage = opts.storage || new MemoryStorageAdapter();
    this.defaultTtlMs = opts.defaultTtlMs ?? 24 * 60 * 60 * 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.storage.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    return this.storage.set<T>(key, value, ttlMs ?? this.defaultTtlMs);
  }

  async delete(key: string): Promise<void> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    return this.storage.clear();
  }
}
