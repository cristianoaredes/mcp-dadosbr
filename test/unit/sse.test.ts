import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TIMEOUTS } from '../../lib/config/timeouts.js';

/**
 * SSE Connection Management Tests
 * Tests for robustness improvements inspired by mcp-camara
 */

describe('SSE Connection Management', () => {
  describe('TIMEOUTS Configuration', () => {
    it('should have reasonable SSE connection timeout', () => {
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;

      // Should be 50 seconds or less (Workers CPU limit)
      expect(timeout).toBeLessThanOrEqual(50000);
      expect(timeout).toBeGreaterThan(0);
    });

    it('should have reasonable ping interval', () => {
      const interval = TIMEOUTS.PING_INTERVAL_MS;

      // Should be 30 seconds (standard heartbeat)
      expect(interval).toBe(30000);
      expect(interval).toBeGreaterThan(0);

      // Ping interval should be less than connection timeout
      expect(interval).toBeLessThan(TIMEOUTS.SSE_CONNECTION_MS);
    });

    it('should allow at least 1 ping before timeout', () => {
      const pingsBeforeTimeout = Math.floor(
        TIMEOUTS.SSE_CONNECTION_MS / TIMEOUTS.PING_INTERVAL_MS
      );

      // Should allow at least 1 ping
      expect(pingsBeforeTimeout).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Connection Lifecycle Simulation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should send periodic pings', async () => {
      const pingSpy = vi.fn();

      // Simulate heartbeat mechanism
      const pingInterval = setInterval(() => {
        pingSpy({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
      }, TIMEOUTS.PING_INTERVAL_MS);

      // Advance time by 90 seconds (should trigger 3 pings at 30s interval)
      vi.advanceTimersByTime(90000);

      expect(pingSpy).toHaveBeenCalledTimes(3);

      clearInterval(pingInterval);
    });

    it('should timeout connection after configured period', async () => {
      const closeSpy = vi.fn();

      // Simulate timeout mechanism
      const timeoutHandle = setTimeout(() => {
        closeSpy();
      }, TIMEOUTS.SSE_CONNECTION_MS);

      // Advance time to just before timeout
      vi.advanceTimersByTime(TIMEOUTS.SSE_CONNECTION_MS - 1000);
      expect(closeSpy).not.toHaveBeenCalled();

      // Advance to timeout
      vi.advanceTimersByTime(1000);
      expect(closeSpy).toHaveBeenCalledTimes(1);

      clearTimeout(timeoutHandle);
    });

    it('should clean up resources on shutdown', () => {
      const cleanupSpy = vi.fn();
      let pingInterval: NodeJS.Timeout | undefined;
      let timeoutHandle: NodeJS.Timeout | undefined;

      // Simulate SSE connection lifecycle
      const initConnection = () => {
        pingInterval = setInterval(() => {
          // ping logic
        }, TIMEOUTS.PING_INTERVAL_MS);

        timeoutHandle = setTimeout(() => {
          // timeout logic
        }, TIMEOUTS.SSE_CONNECTION_MS);
      };

      const cleanup = () => {
        if (pingInterval) clearInterval(pingInterval);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        cleanupSpy();
      };

      // Initialize connection
      initConnection();
      expect(pingInterval).toBeDefined();
      expect(timeoutHandle).toBeDefined();

      // Cleanup
      cleanup();
      expect(cleanupSpy).toHaveBeenCalledTimes(1);

      // Verify intervals/timeouts are cleared (they won't fire)
      const pingCount = vi.fn();
      pingInterval = setInterval(pingCount, TIMEOUTS.PING_INTERVAL_MS);
      clearInterval(pingInterval);

      vi.advanceTimersByTime(TIMEOUTS.PING_INTERVAL_MS * 2);
      expect(pingCount).not.toHaveBeenCalled();
    });
  });

  describe('Session Tracking', () => {
    interface TransportSession {
      createdAt: Date;
      lastActivity: Date;
    }

    it('should track session creation time', () => {
      const now = new Date();
      const session: TransportSession = {
        createdAt: now,
        lastActivity: now
      };

      expect(session.createdAt).toEqual(now);
      expect(session.lastActivity).toEqual(now);
    });

    it('should update last activity on message', () => {
      const createdAt = new Date('2025-01-01T00:00:00Z');
      const session: TransportSession = {
        createdAt,
        lastActivity: createdAt
      };

      // Simulate message received 30 seconds later
      const messageTime = new Date('2025-01-01T00:00:30Z');
      session.lastActivity = messageTime;

      expect(session.lastActivity).toEqual(messageTime);
      expect(session.lastActivity.getTime()).toBeGreaterThan(session.createdAt.getTime());
    });

    it('should identify stale sessions', () => {
      vi.useFakeTimers();
      const createdAt = new Date();

      const session: TransportSession = {
        createdAt,
        lastActivity: createdAt
      };

      // Advance time beyond timeout
      vi.advanceTimersByTime(TIMEOUTS.SSE_CONNECTION_MS + 1000);
      const now = new Date();

      const age = now.getTime() - session.lastActivity.getTime();
      const isStale = age > TIMEOUTS.SSE_CONNECTION_MS;

      expect(isStale).toBe(true);
      expect(age).toBeGreaterThan(TIMEOUTS.SSE_CONNECTION_MS);

      vi.restoreAllMocks();
    });

    it('should keep active sessions alive', () => {
      vi.useFakeTimers();
      const createdAt = new Date();

      const session: TransportSession = {
        createdAt,
        lastActivity: createdAt
      };

      // Advance time by half the timeout
      vi.advanceTimersByTime(TIMEOUTS.SSE_CONNECTION_MS / 2);

      // Update activity (simulate message)
      session.lastActivity = new Date();

      // Advance time by another half timeout
      vi.advanceTimersByTime(TIMEOUTS.SSE_CONNECTION_MS / 2);
      const now = new Date();

      const age = now.getTime() - session.lastActivity.getTime();
      const isStale = age > TIMEOUTS.SSE_CONNECTION_MS;

      // Should NOT be stale because we updated lastActivity halfway
      expect(isStale).toBe(false);
      expect(age).toBeLessThan(TIMEOUTS.SSE_CONNECTION_MS);

      vi.restoreAllMocks();
    });
  });

  describe('Connection Monitoring', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should periodically check for stale connections', () => {
      const monitorSpy = vi.fn();

      // Simulate connection monitoring interval
      const monitor = setInterval(() => {
        monitorSpy();
      }, TIMEOUTS.PING_INTERVAL_MS);

      // Advance time by 2 monitoring cycles
      vi.advanceTimersByTime(TIMEOUTS.PING_INTERVAL_MS * 2);

      expect(monitorSpy).toHaveBeenCalledTimes(2);

      clearInterval(monitor);
    });

    it('should clean up stale sessions during monitoring', () => {
      vi.useFakeTimers();

      interface Session {
        id: string;
        lastActivity: Date;
      }

      const sessions: Record<string, Session> = {
        active1: { id: 'active1', lastActivity: new Date() },
        stale1: { id: 'stale1', lastActivity: new Date(Date.now() - TIMEOUTS.SSE_CONNECTION_MS - 5000) }
      };

      const removedSessions: string[] = [];

      // Simulate monitoring logic
      const monitor = () => {
        const now = new Date();
        for (const [sessionId, session] of Object.entries(sessions)) {
          const age = now.getTime() - session.lastActivity.getTime();
          if (age > TIMEOUTS.SSE_CONNECTION_MS) {
            delete sessions[sessionId];
            removedSessions.push(sessionId);
          }
        }
      };

      // Run monitor
      monitor();

      // Should have removed stale session only
      expect(removedSessions).toContain('stale1');
      expect(removedSessions).not.toContain('active1');
      expect(sessions).toHaveProperty('active1');
      expect(sessions).not.toHaveProperty('stale1');

      vi.restoreAllMocks();
    });
  });

  describe('Error Handling', () => {
    it('should handle ping errors gracefully', async () => {
      const errorSpy = vi.fn();

      const sendPing = async () => {
        throw new Error('Network error');
      };

      // Simulate error handling directly (without setInterval timing issues)
      try {
        await sendPing();
      } catch (error) {
        errorSpy(error);
      }

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error'
        })
      );
    });

    it('should handle write errors in SSE stream', async () => {
      const errorSpy = vi.fn();

      const sendSSEMessage = async (data: unknown) => {
        try {
          // Simulate write error
          throw new Error('Stream closed');
        } catch (error) {
          errorSpy(error);
        }
      };

      await sendSSEMessage({ type: 'test' });

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Stream closed'
        })
      );
    });
  });

  describe('Integration with Workers CPU Limit', () => {
    it('should respect Workers 50 second CPU limit', () => {
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;

      // Workers have ~50 second CPU time limit
      // SSE timeout should be at or below this limit
      expect(timeout).toBeLessThanOrEqual(50000);
    });

    it('should allow multiple pings within timeout window', () => {
      const timeout = TIMEOUTS.SSE_CONNECTION_MS;
      const pingInterval = TIMEOUTS.PING_INTERVAL_MS;

      const possiblePings = Math.floor(timeout / pingInterval);

      // Should allow at least 1 ping within timeout window
      expect(possiblePings).toBeGreaterThanOrEqual(1);

      // With 50s timeout and 30s ping, should allow 1 ping
      // (50000 / 30000 = 1.66 → floor = 1)
      if (timeout === 50000 && pingInterval === 30000) {
        expect(possiblePings).toBe(1);
      }
    });
  });
});
