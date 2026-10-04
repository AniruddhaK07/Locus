/**
 * Locus Engine — Circuit Breaker Pattern
 *
 * Prevents cascading failures and endless retry loops when external
 * third-party services (Overpass, OSRM) enter rate-limiting or server failure.
 * Trips after consecutive failures, immediately failing pending calls.
 */

export interface CircuitBreakerOptions {
  failureThreshold?: number; // default: 3 consecutive failures
  cooldownMs?: number; // default: 60,000 ms before half-open attempt
}

export class CircuitBreaker {
  private failureCount: number = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private lastFailureTime: number = 0;
  private failureThreshold: number;
  private cooldownMs: number;

  constructor(opts?: CircuitBreakerOptions) {
    this.failureThreshold = opts?.failureThreshold ?? 3;
    this.cooldownMs = opts?.cooldownMs ?? 60_000;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = performance.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }

  public isOpen(): boolean {
    if (this.state === "OPEN") {
      if (performance.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = "HALF_OPEN";
        return false;
      }
      return true;
    }
    return false;
  }

  public getFailureCount(): number {
    return this.failureCount;
  }

  public getState(): "CLOSED" | "OPEN" | "HALF_OPEN" {
    return this.state;
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastFailureTime = 0;
  }
}
