import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "../../lib/infrastructure/rate-limiter.js";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    rateLimiter = new RateLimiter({
      windowMs: 60000,  // 1 minute
      maxRequests: 5    // 5 requests for easy testing
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("checkLimit", () => {
    it("should allow requests within limit", () => {
      expect(rateLimiter.checkLimit("client1")).toBe(true);
      expect(rateLimiter.checkLimit("client1")).toBe(true);
      expect(rateLimiter.checkLimit("client1")).toBe(true);
      expect(rateLimiter.checkLimit("client1")).toBe(true);
      expect(rateLimiter.checkLimit("client1")).toBe(true);
    });

    it("should block requests exceeding limit", () => {
      // Use up all 5 requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit("client1")).toBe(true);
      }

      // 6th request should be blocked
      expect(rateLimiter.checkLimit("client1")).toBe(false);
      expect(rateLimiter.checkLimit("client1")).toBe(false);
    });

    it("should track different clients independently", () => {
      // Client 1 uses all requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit("client1")).toBe(true);
      }
      expect(rateLimiter.checkLimit("client1")).toBe(false);

      // Client 2 should still be allowed
      expect(rateLimiter.checkLimit("client2")).toBe(true);
      expect(rateLimiter.checkLimit("client2")).toBe(true);
    });

    it("should reset after time window expires", () => {
      // Use up all requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.checkLimit("client1")).toBe(true);
      }
      expect(rateLimiter.checkLimit("client1")).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60001);

      // Should be allowed again
      expect(rateLimiter.checkLimit("client1")).toBe(true);
    });
  });

  describe("getRemaining", () => {
    it("should return max requests for new client", () => {
      expect(rateLimiter.getRemaining("newclient")).toBe(5);
    });

    it("should decrease remaining count as requests are made", () => {
      expect(rateLimiter.getRemaining("client1")).toBe(5);

      rateLimiter.checkLimit("client1");
      expect(rateLimiter.getRemaining("client1")).toBe(4);

      rateLimiter.checkLimit("client1");
      expect(rateLimiter.getRemaining("client1")).toBe(3);
    });

    it("should return 0 when limit is exceeded", () => {
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit("client1");
      }
      expect(rateLimiter.getRemaining("client1")).toBe(0);
    });

    it("should reset to max after window expires", () => {
      rateLimiter.checkLimit("client1");
      rateLimiter.checkLimit("client1");
      expect(rateLimiter.getRemaining("client1")).toBe(3);

      vi.advanceTimersByTime(60001);
      expect(rateLimiter.getRemaining("client1")).toBe(5);
    });
  });

  describe("getResetTime", () => {
    it("should return 0 for new client", () => {
      expect(rateLimiter.getResetTime("newclient")).toBe(0);
    });

    it("should return time until reset", () => {
      rateLimiter.checkLimit("client1");

      const resetTime = rateLimiter.getResetTime("client1");
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000);
    });

    it("should decrease as time passes", () => {
      rateLimiter.checkLimit("client1");

      const resetTime1 = rateLimiter.getResetTime("client1");
      vi.advanceTimersByTime(10000);
      const resetTime2 = rateLimiter.getResetTime("client1");

      expect(resetTime2).toBeLessThan(resetTime1);
      expect(resetTime2).toBe(resetTime1 - 10000);
    });

    it("should return 0 after window expires", () => {
      rateLimiter.checkLimit("client1");
      vi.advanceTimersByTime(60001);

      expect(rateLimiter.getResetTime("client1")).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return configuration", () => {
      const stats = rateLimiter.getStats();

      expect(stats.windowMs).toBe(60000);
      expect(stats.maxRequests).toBe(5);
      expect(stats.activeClients).toBe(0);
    });

    it("should track active clients", () => {
      rateLimiter.checkLimit("client1");
      rateLimiter.checkLimit("client2");

      const stats = rateLimiter.getStats();
      expect(stats.activeClients).toBe(2);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", () => {
      // Create multiple clients
      rateLimiter.checkLimit("client1");
      rateLimiter.checkLimit("client2");
      rateLimiter.checkLimit("client3");

      expect(rateLimiter.getStats().activeClients).toBe(3);

      // Advance time past window
      vi.advanceTimersByTime(60001);

      // Trigger cleanup (normally runs on interval)
      // Access private method via type assertion for testing
      (rateLimiter as any).cleanup();

      expect(rateLimiter.getStats().activeClients).toBe(0);
    });
  });
});
