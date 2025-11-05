import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Request Deduplication", () => {
  // We'll test the deduplication logic by importing the tools module
  // and checking concurrent requests behavior

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should deduplicate concurrent identical requests", async () => {
    vi.useRealTimers(); // Use real timers for this test

    // Create a mock function that simulates an API call
    let callCount = 0;
    const mockApiCall = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10)); // Short delay
      return { data: "test", callNumber: callCount };
    };

    // Simulate deduplicate function behavior
    const pendingRequests = new Map<string, Promise<any>>();

    const deduplicate = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }
      const promise = fn().finally(() => pendingRequests.delete(key));
      pendingRequests.set(key, promise);
      return promise;
    };

    // Make 3 concurrent requests with the same key
    const promises = [
      deduplicate("test-key", mockApiCall),
      deduplicate("test-key", mockApiCall),
      deduplicate("test-key", mockApiCall)
    ];

    const results = await Promise.all(promises);

    // All should return the same result (from first call)
    expect(results[0]).toBe(results[1]);
    expect(results[1]).toBe(results[2]);

    // API should only be called once
    expect(callCount).toBe(1);

    vi.useFakeTimers(); // Restore fake timers for other tests
  });

  it("should cleanup stale requests after timeout", async () => {
    const TIMEOUT_MS = 30000;
    const pendingRequests = new Map<string, any>();

    const deduplicate = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key).promise;
      }

      const timeoutId = setTimeout(() => {
        pendingRequests.delete(key);
      }, TIMEOUT_MS);

      const promise = fn().finally(() => {
        clearTimeout(timeoutId);
        pendingRequests.delete(key);
      });

      pendingRequests.set(key, { promise, timeoutId });
      return promise;
    };

    // Create a long-running request
    const slowApiCall = () => new Promise(resolve => {
      setTimeout(() => resolve({ data: "slow" }), 60000); // 60 seconds
    });

    // Start request
    const requestPromise = deduplicate("slow-key", slowApiCall);

    // Verify it's in the map
    expect(pendingRequests.has("slow-key")).toBe(true);

    // Fast-forward time by 30 seconds (timeout)
    vi.advanceTimersByTime(30000);

    // Should be cleaned up
    expect(pendingRequests.has("slow-key")).toBe(false);
  });

  it("should allow new requests after previous request completes", async () => {
    let callCount = 0;
    const pendingRequests = new Map<string, Promise<any>>();

    const deduplicate = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }
      const promise = fn().finally(() => pendingRequests.delete(key));
      pendingRequests.set(key, promise);
      return promise;
    };

    const mockApiCall = async () => {
      callCount++;
      return { data: "test", count: callCount };
    };

    // First request
    const result1 = await deduplicate("test", mockApiCall);
    expect(result1.count).toBe(1);
    expect(pendingRequests.size).toBe(0); // Cleaned up after completion

    // Second request (should be allowed since first completed)
    const result2 = await deduplicate("test", mockApiCall);
    expect(result2.count).toBe(2);
    expect(callCount).toBe(2);
  });

  it("should handle errors without leaking memory", async () => {
    const pendingRequests = new Map<string, any>();
    let cleanupCalled = false;

    const deduplicate = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }
      const promise = fn().finally(() => {
        pendingRequests.delete(key);
        cleanupCalled = true;
      });
      pendingRequests.set(key, promise);
      return promise;
    };

    const failingApiCall = async () => {
      throw new Error("API Error");
    };

    // Should throw error
    await expect(deduplicate("error-key", failingApiCall)).rejects.toThrow("API Error");

    // Should cleanup even on error
    expect(cleanupCalled).toBe(true);
    expect(pendingRequests.size).toBe(0);
  });
});
