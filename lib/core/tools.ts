/**
 * Tool orchestration — slim wrapper using the tool registry.
 * 
 * All tool definitions and execution logic live in lib/tools/*.
 * This file provides the public API (TOOL_DEFINITIONS, executeTool, metrics).
 */

import { Cache, LookupResult, Metrics, ApiConfig } from "../types/index.js";

// Import barrel to trigger all tool registrations
import {
  getToolDefinitions,
  executeRegisteredTool,
  getToolCount,
} from "../tools/index.js";

// ─── Metrics ────────────────────────────────────────────────────────────────

let metrics: Metrics = {
  requests: 0,
  cacheHits: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now(),
};

function logPerformanceMetrics(): void {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  const avgTime = metrics.requests > 0 ? metrics.totalTime / metrics.requests : 0;
  console.log(
    `[metrics] requests=${metrics.requests} cache_hits=${metrics.cacheHits} errors=${metrics.errors} avg_time=${avgTime.toFixed(0)}ms uptime=${uptime.toFixed(0)}s tools=${getToolCount()}`
  );
}

let lastMetricsLog = 0;

function recordMetrics(elapsed: number, fromCache: boolean, error: boolean): void {
  metrics.requests++;
  metrics.totalTime += elapsed;
  if (fromCache) metrics.cacheHits++;
  if (error) metrics.errors++;
  if (metrics.requests - lastMetricsLog >= 100) {
    logPerformanceMetrics();
    lastMetricsLog = metrics.requests;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * All registered tool definitions (for MCP server listing).
 */
export const TOOL_DEFINITIONS = getToolDefinitions();

/**
 * Execute a tool by name.
 */
export async function executeTool(
  name: string,
  args: unknown,
  apiConfig: ApiConfig,
  cache?: Cache,
): Promise<LookupResult> {
  const startTime = Date.now();
  try {
    const result = await executeRegisteredTool(name, args, apiConfig, cache);
    recordMetrics(Date.now() - startTime, false, !result.ok);
    return result;
  } catch (err) {
    recordMetrics(Date.now() - startTime, false, true);
    throw err;
  }
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function resetMetrics(): void {
  metrics = {
    requests: 0,
    cacheHits: 0,
    errors: 0,
    totalTime: 0,
    startTime: Date.now(),
  };
}
