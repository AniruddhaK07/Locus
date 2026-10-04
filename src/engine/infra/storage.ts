/**
 * Locus Engine — Storage Adapter
 *
 * Pluggable storage abstraction: IndexedDB in browser, Memory in tests/Node.
 */

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface StoredEnvelope<T> {
  data: T;
  expiresAt: number | null;
}

export class MemoryStorageAdapter implements StorageAdapter {
  private store: Map<string, StoredEnvelope<unknown>> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.data as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.store.set(key, { data: value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

const DB_NAME = "locus_cache_db";
const STORE_NAME = "http_cache";

export class IndexedDBStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallback: MemoryStorageAdapter = new MemoryStorageAdapter();

  constructor() {
    if (typeof window !== "undefined" && "indexedDB" in window) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "key" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.dbPromise) {
      return this.fallback.get<T>(key);
    }
    try {
      const db = await this.dbPromise;
      return new Promise<T | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const entry = req.result as { key: string; envelope: StoredEnvelope<T> } | undefined;
          if (!entry) return resolve(null);
          const { envelope } = entry;
          if (envelope.expiresAt !== null && Date.now() > envelope.expiresAt) {
            this.delete(key).catch(() => {});
            return resolve(null);
          }
          resolve(envelope.data);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return this.fallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (!this.dbPromise) {
      return this.fallback.set<T>(key, value, ttlMs);
    }
    try {
      const db = await this.dbPromise;
      const expiresAt = ttlMs ? Date.now() + ttlMs : null;
      const envelope: StoredEnvelope<T> = { data: value, expiresAt };
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({ key, envelope });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      return this.fallback.set<T>(key, value, ttlMs);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.dbPromise) {
      return this.fallback.delete(key);
    }
    try {
      const db = await this.dbPromise;
      return new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      return this.fallback.delete(key);
    }
  }

  async clear(): Promise<void> {
    if (!this.dbPromise) {
      return this.fallback.clear();
    }
    try {
      const db = await this.dbPromise;
      return new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {
      return this.fallback.clear();
    }
  }
}
