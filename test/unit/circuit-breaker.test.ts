/**
 * Circuit Breaker Unit Tests
 * Tests thread-safety, state transitions, and failure handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker, CircuitBreakerOpenError } from '../../lib/infrastructure/http/circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      halfOpenMaxAttempts: 2,
    });
  });

  describe('CLOSED state', () => {
    it('should execute successfully in CLOSED state', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should remain CLOSED after single failure', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow('fail');

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition to OPEN after threshold failures', async () => {
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(async () => {
            throw new Error('fail');
          })
        ).rejects.toThrow('fail');
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('OPEN state', () => {
    beforeEach(async () => {
      // Force to OPEN state
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(async () => {
            throw new Error('fail');
          })
        ).rejects.toThrow();
      }
    });

    it('should reject immediately when OPEN', async () => {
      await expect(
        circuitBreaker.execute(async () => 'should not execute')
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should include retry time in error message', async () => {
      try {
        await circuitBreaker.execute(async () => 'test');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(CircuitBreakerOpenError);
        expect(error.message).toMatch(/Retry after \d+s/);
      }
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Next call should attempt execution (HALF_OPEN)
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(async () => {
      // Force to OPEN, then wait for HALF_OPEN transition
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(async () => {
            throw new Error('fail');
          })
        ).rejects.toThrow();
      }
      await new Promise(resolve => setTimeout(resolve, 1100));
    });

    it('should transition to CLOSED on success', async () => {
      const result = await circuitBreaker.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition back to OPEN on failure', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('still failing');
        })
      ).rejects.toThrow('still failing');

      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Metrics', () => {
    it('should track failure count', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow();

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failures).toBe(1);
    });

    it('should reset failure count on success', async () => {
      // Fail once
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow();

      // Success resets
      await circuitBreaker.execute(async () => 'success');

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.failures).toBe(0);
    });

    it('should track last failure time', async () => {
      const before = Date.now();

      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('fail');
        })
      ).rejects.toThrow();

      const metrics = circuitBreaker.getMetrics();
      expect(metrics.lastFailureTime).toBeGreaterThanOrEqual(before);
      expect(metrics.timeSinceLastFailure).toBeLessThan(100);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', async () => {
      // Force to OPEN
      for (let i = 0; i < 3; i++) {
        await expect(
          circuitBreaker.execute(async () => {
            throw new Error('fail');
          })
        ).rejects.toThrow();
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Reset
      circuitBreaker.reset();

      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.getMetrics().failures).toBe(0);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent executions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        circuitBreaker.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return i;
        })
      );

      const results = await Promise.all(promises);
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should correctly count failures under concurrent load', async () => {
      const promises = Array.from({ length: 5 }, () =>
        circuitBreaker.execute(async () => {
          throw new Error('concurrent fail');
        }).catch(() => {})
      );

      await Promise.all(promises);

      // Should have counted 5 failures and opened
      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.getMetrics().failures).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle synchronous errors', async () => {
      await expect(
        circuitBreaker.execute(async () => {
          throw new Error('sync error');
        })
      ).rejects.toThrow('sync error');
    });

    it('should handle promise rejections', async () => {
      await expect(
        circuitBreaker.execute(() => Promise.reject(new Error('async error')))
      ).rejects.toThrow('async error');
    });

    it('should preserve error types', async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      await expect(
        circuitBreaker.execute(async () => {
          throw new CustomError('custom');
        })
      ).rejects.toThrow(CustomError);
    });
  });
});
