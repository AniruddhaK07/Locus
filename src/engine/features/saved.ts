/**
 * Locus Engine — Saved Localities Manager
 *
 * Implements §4.8 saved areas:
 * - Persistent saved locality list stored in localStorage.
 * - Reactive subscription model for UI updates.
 * - Cross-tab synchronization via window 'storage' events.
 */

import type { AreaId } from "../domain/types";

export class SavedStore {
  private saved: Set<AreaId> = new Set();
  private subscribers: Set<() => void> = new Set();
  private storageKey: string;

  constructor(storageKey = "locus_saved_areas") {
    this.storageKey = storageKey;
    this.loadFromStorage();
    this.setupCrossTabSync();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(this.storageKey);
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          this.saved.clear();
          for (const id of ids) {
            this.saved.add(id);
          }
        }
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  private persist(): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(
          this.storageKey,
          JSON.stringify(Array.from(this.saved))
        );
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
    this.notify();
  }

  private notify(): void {
    for (const sub of this.subscribers) {
      sub();
    }
  }

  private setupCrossTabSync(): void {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("storage", (event) => {
        if (event.key === this.storageKey) {
          this.loadFromStorage();
          this.notify();
        }
      });
    }
  }

  list(): AreaId[] {
    return Array.from(this.saved);
  }

  has(id: AreaId): boolean {
    return this.saved.has(id);
  }

  toggle(id: AreaId): void {
    if (this.saved.has(id)) {
      this.saved.delete(id);
    } else {
      this.saved.add(id);
    }
    this.persist();
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  clear(): void {
    this.saved.clear();
    this.persist();
  }
}
