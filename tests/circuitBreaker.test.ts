import { describe, it, expect } from "vitest";
import { CircuitBreaker } from "../src/engine/infra/circuitBreaker";

describe("CircuitBreaker", () => {
  it("starts in CLOSED state with 0 failures", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getFailureCount()).toBe(0);
  });

  it("trips to OPEN state after reaching failure threshold", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
    expect(cb.getState()).toBe("OPEN");
  });

  it("resets failure count and closes on success", () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getFailureCount()).toBe(2);
    cb.recordSuccess();
    expect(cb.getFailureCount()).toBe(0);
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState()).toBe("CLOSED");
  });

  it("transitions to HALF_OPEN after cooldown period", () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 50 });
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(cb.isOpen()).toBe(false);
        expect(cb.getState()).toBe("HALF_OPEN");
        resolve();
      }, 70);
    });
  });
});
