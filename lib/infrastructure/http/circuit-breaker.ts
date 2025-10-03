/**
 * Thread-safe Circuit Breaker implementation
 * Protects against cascading failures in external API calls
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
}

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  private halfOpenAttempts = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeoutMs: config?.resetTimeoutMs ?? 30000,
      halfOpenMaxAttempts: config?.halfOpenMaxAttempts ?? 3,
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      
      if (timeSinceLastFailure < this.config.resetTimeoutMs) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN. Retry after ${Math.ceil((this.config.resetTimeoutMs - timeSinceLastFailure) / 1000)}s`
        );
      }
      
      // Transition to HALF_OPEN
      this.state = 'HALF_OPEN';
      this.halfOpenAttempts = 0;
    }

    // Execute in HALF_OPEN state
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        throw new CircuitBreakerOpenError('Circuit breaker HALF_OPEN limit reached');
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Failed in HALF_OPEN, go back to OPEN
      this.state = 'OPEN';
      this.halfOpenAttempts = 0;
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      timeSinceLastFailure: this.lastFailureTime ? Date.now() - this.lastFailureTime : null,
    };
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
    this.halfOpenAttempts = 0;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
