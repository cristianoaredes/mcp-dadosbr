import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Test concurrent execution with limit
 * This replicates the executeWithConcurrencyLimit function for testing
 */

async function executeWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  const executing: Set<Promise<void>> = new Set();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Create a promise that stores result and removes itself when done
    const promise = task()
      .then(
        value => {
          results[i] = { status: 'fulfilled', value };
        },
        reason => {
          results[i] = { status: 'rejected', reason };
        }
      )
      .then(() => {
        executing.delete(promise);
      });

    executing.add(promise);

    // If we hit the concurrency limit, wait for one to complete
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  // Wait for all remaining promises
  await Promise.all(executing);

  return results;
}

describe('Concurrency Limiter', () => {
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

    it('should respect concurrency limit', async () => {
      let currentlyRunning = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 10 }, (_, i) => {
        return async () => {
          currentlyRunning++;
          maxConcurrent = Math.max(maxConcurrent, currentlyRunning);

          // Simulate async work
          await new Promise(resolve => setTimeout(resolve, 10));

          currentlyRunning--;
          return i;
        };
      });

      const limit = 3;
      await executeWithConcurrencyLimit(tasks, limit);

      // Maximum concurrent should not exceed limit
      expect(maxConcurrent).toBeLessThanOrEqual(limit);
      expect(maxConcurrent).toBeGreaterThan(0);
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

      // Check successful tasks
      expect(results[0]).toEqual({ status: 'fulfilled', value: 'success1' });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'success2' });
      expect(results[4]).toEqual({ status: 'fulfilled', value: 'success3' });

      // Check failed tasks
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

      const results = await executeWithConcurrencyLimit(tasks, 10);

      expect(results).toHaveLength(3);
      // All tasks should run concurrently since limit > task count
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

      await executeWithConcurrencyLimit(tasks, 1);

      // With limit 1, tasks should execute in order
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

      const results = await executeWithConcurrencyLimit(tasks, 3);

      // Results should be in original task order, not completion order
      expect(results[0]).toEqual({ status: 'fulfilled', value: 'slow' });
      expect(results[1]).toEqual({ status: 'fulfilled', value: 'fast' });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'medium' });
    });

    it('should handle varying task durations with concurrency limit', async () => {
      const durations = [50, 10, 30, 15, 25, 5];
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      const tasks = durations.map((duration, i) => {
        return async () => {
          startTimes[i] = Date.now();
          await new Promise(resolve => setTimeout(resolve, duration));
          endTimes[i] = Date.now();
          return i;
        };
      });

      const startTime = Date.now();
      const results = await executeWithConcurrencyLimit(tasks, 2);
      const totalTime = Date.now() - startTime;

      // All tasks should complete
      expect(results).toHaveLength(6);
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);

      // Total time should be less than sequential execution
      const sequentialTime = durations.reduce((sum, d) => sum + d, 0);
      expect(totalTime).toBeLessThan(sequentialTime);
    });
  });

  describe('Performance characteristics', () => {
    it('should provide significant speedup over sequential execution', async () => {
      const taskDuration = 20; // ms
      const taskCount = 10;
      const concurrencyLimit = 5;

      const tasks = Array.from({ length: taskCount }, (_, i) => {
        return async () => {
          await new Promise(resolve => setTimeout(resolve, taskDuration));
          return i;
        };
      });

      const startTime = Date.now();
      await executeWithConcurrencyLimit(tasks, concurrencyLimit);
      const concurrentTime = Date.now() - startTime;

      // Expected time should be approximately:
      // (taskCount / concurrencyLimit) * taskDuration
      const expectedTime = Math.ceil(taskCount / concurrencyLimit) * taskDuration;

      // Allow 50% margin for overhead and timing variability
      expect(concurrentTime).toBeLessThan(expectedTime * 1.5);

      // Should be significantly faster than sequential
      const sequentialTime = taskCount * taskDuration;
      expect(concurrentTime).toBeLessThan(sequentialTime * 0.7);
    });
  });
});
