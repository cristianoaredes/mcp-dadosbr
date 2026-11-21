import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { executeWithConcurrencyLimit } from '../../lib/core/intelligence.js';

describe('Concurrency Limiter (lib/core/intelligence)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-20T18:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('executeWithConcurrencyLimit', () => {
    it('should execute all tasks and return results', async () => {
      const tasks = [
        async () => 1,
        async () => 2,
        async () => 3,
        async () => 4,
        async () => 5,
      ];

      const results = await executeWithConcurrencyLimit(tasks, 2);

      expect(results).toHaveLength(5);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      const values = results.map(r => r.status === 'fulfilled' ? r.value : null);
      expect(values).toEqual([1, 2, 3, 4, 5]);
    });

    it('should respect concurrency limit using fake timers', async () => {
      let currentlyRunning = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 10 }, (_, i) => {
        return async () => {
          currentlyRunning++;
          maxConcurrent = Math.max(maxConcurrent, currentlyRunning);

          await new Promise(resolve => setTimeout(resolve, 10));

          currentlyRunning--;
          return i;
        };
      });

      const limit = 3;
      const runPromise = executeWithConcurrencyLimit(tasks, limit);
      await vi.runAllTimersAsync();
      const results = await runPromise;

      expect(results).toHaveLength(10);
      expect(maxConcurrent).toBe(limit);
    });

    it('should handle task failures gracefully', async () => {
      const tasks = [
        async () => 'success1',
        async () => { throw new Error('task failed'); },
        async () => 'success2',
        async () => { throw new Error('another failure'); },
        async () => 'success3',
      ];

      const results = await executeWithConcurrencyLimit(tasks, 2);

      expect(results).toHaveLength(5);
      expect(results[0]).toEqual({ status: 'fulfilled', value: 'success1' });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'success2' });
      expect(results[4]).toEqual({ status: 'fulfilled', value: 'success3' });

      expect(results[1].status).toBe('rejected');
      expect(results[3].status).toBe('rejected');

      if (results[1].status === 'rejected') {
        expect(results[1].reason).toBeInstanceOf(Error);
        expect(results[1].reason.message).toBe('task failed');
      }

      if (results[3].status === 'rejected') {
        expect(results[3].reason).toBeInstanceOf(Error);
        expect(results[3].reason.message).toBe('another failure');
      }
    });

    it('should handle empty task array', async () => {
      const tasks: (() => Promise<number>)[] = [];
      const results = await executeWithConcurrencyLimit(tasks, 3);

      expect(results).toHaveLength(0);
    });

    it('should handle single task', async () => {
      const tasks = [async () => 'single'];
      const results = await executeWithConcurrencyLimit(tasks, 3);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ status: 'fulfilled', value: 'single' });
    });

    it('should handle limit greater than task count', async () => {
      let currentlyRunning = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 3 }, (_, i) => {
        return async () => {
          currentlyRunning++;
          maxConcurrent = Math.max(maxConcurrent, currentlyRunning);
          await new Promise(resolve => setTimeout(resolve, 10));
          currentlyRunning--;
          return i;
        };
      });

      const runPromise = executeWithConcurrencyLimit(tasks, 10);
      await vi.runAllTimersAsync();
      const results = await runPromise;

      expect(results).toHaveLength(3);
      expect(maxConcurrent).toBe(3);
    });

    it('should handle limit of 1 (sequential execution)', async () => {
      const executionOrder: number[] = [];

      const tasks = Array.from({ length: 5 }, (_, i) => {
        return async () => {
          executionOrder.push(i);
          await new Promise(resolve => setTimeout(resolve, 5));
          return i;
        };
      });

      const runPromise = executeWithConcurrencyLimit(tasks, 1);
      await vi.runAllTimersAsync();
      await runPromise;

      expect(executionOrder).toEqual([0, 1, 2, 3, 4]);
    });

    it('should preserve result order regardless of completion order', async () => {
      const tasks = [
        async () => {
          await new Promise(resolve => setTimeout(resolve, 30));
          return 'slow';
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'fast';
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          return 'medium';
        },
      ];

      const runPromise = executeWithConcurrencyLimit(tasks, 3);
      await vi.runAllTimersAsync();
      const results = await runPromise;

      expect(results[0]).toEqual({ status: 'fulfilled', value: 'slow' });
      expect(results[1]).toEqual({ status: 'fulfilled', value: 'fast' });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'medium' });
    });

    it('should handle varying task durations with concurrency limit under virtual time', async () => {
      const durations = [50, 10, 30, 15, 25, 5];

      const tasks = durations.map((duration, i) => {
        return async () => {
          await new Promise(resolve => setTimeout(resolve, duration));
          return i;
        };
      });

      const startTime = Date.now();
      const runPromise = executeWithConcurrencyLimit(tasks, 2);
      await vi.runAllTimersAsync();
      const results = await runPromise;
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(6);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      const sequentialTime = durations.reduce((sum, d) => sum + d, 0);
      expect(totalTime).toBeLessThan(sequentialTime);
    });

    it('stops scheduling remaining tasks when AbortSignal aborts', async () => {
      const controller = new AbortController();
      const started: number[] = [];

      const tasks = Array.from({ length: 6 }, (_, i) => async () => {
        started.push(i);
        if (i === 1) {
          controller.abort();
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        return i;
      });

      const runPromise = executeWithConcurrencyLimit(tasks, 2, controller.signal);
      await vi.runAllTimersAsync();
      const results = await runPromise;

      expect(started).toEqual([0, 1]);
      expect(results.slice(2).every(r => r === undefined)).toBe(true);
    });
  });

  describe('Performance characteristics (virtual clock)', () => {
    it('should provide deterministic speedup over sequential execution', async () => {
      const taskDuration = 20;
      const taskCount = 10;
      const concurrencyLimit = 5;

      const tasks = Array.from({ length: taskCount }, (_, i) => {
        return async () => {
          await new Promise(resolve => setTimeout(resolve, taskDuration));
          return i;
        };
      });

      const startTime = Date.now();
      const runPromise = executeWithConcurrencyLimit(tasks, concurrencyLimit);
      await vi.runAllTimersAsync();
      await runPromise;
      const concurrentTime = Date.now() - startTime;

      const expectedTime = Math.ceil(taskCount / concurrencyLimit) * taskDuration;
      expect(concurrentTime).toBe(expectedTime);

      const sequentialTime = taskCount * taskDuration;
      expect(concurrentTime).toBeLessThan(sequentialTime * 0.7);
    });
  });
});
