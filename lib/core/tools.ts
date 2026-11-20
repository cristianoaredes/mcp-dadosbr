/**
 * Tool orchestration — slim wrapper using the tool registry.
 * 
 * All tool definitions and execution logic live in lib/tools/*.
 * This file provides the public API (TOOL_DEFINITIONS, executeTool, metrics).
 */

import { Cache, LookupResult, Metrics, ApiConfig, ToolMetrics } from "../types/index.js";
import type { ToolExecutionContext } from "./registry.js";
import { createLogger } from "../infrastructure/logger.js";
import { RequestContext } from "../infrastructure/tracing.js";
import { maskSensitiveText } from "../shared/log-redaction.js";

// Import barrel to trigger all tool registrations
import {
  getToolDefinitions,
  executeRegisteredTool,
  getToolCount,
} from "../tools/index.js";

const toolsLogger = createLogger("tools");

// ─── Metrics ────────────────────────────────────────────────────────────────

interface MutableToolMetrics {
  requests: number;
  errors: number;
  cacheHits: number;
  totalTimeMs: number;
  maxTimeMs: number;
}

let metrics: Metrics = {
  requests: 0,
  cacheHits: 0,
  errors: 0,
  totalTime: 0,
  startTime: Date.now(),
};

const toolMetrics = new Map<string, MutableToolMetrics>();
let lastMetricsLog = 0;

function logPerformanceMetrics(): void {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  const avgTime = metrics.requests > 0 ? metrics.totalTime / metrics.requests : 0;
  // The Node stdio transport reserves stdout for JSON-RPC.
  console.error(
    `[metrics] requests=${metrics.requests} cache_hits=${metrics.cacheHits} errors=${metrics.errors} avg_time=${avgTime.toFixed(0)}ms uptime=${uptime.toFixed(0)}s tools=${getToolCount()}`
  );
}

function recordMetrics(
  elapsed: number,
  fromCache: boolean,
  error: boolean,
  toolName?: string,
): void {
  metrics.requests++;
  metrics.totalTime += elapsed;
  if (fromCache) metrics.cacheHits++;
  if (error) metrics.errors++;

  if (toolName) {
    const existing = toolMetrics.get(toolName) ?? {
      requests: 0,
      errors: 0,
      cacheHits: 0,
      totalTimeMs: 0,
      maxTimeMs: 0,
    };
    existing.requests++;
    existing.totalTimeMs += elapsed;
    if (elapsed > existing.maxTimeMs) existing.maxTimeMs = elapsed;
    if (fromCache) existing.cacheHits++;
    if (error) existing.errors++;
    toolMetrics.set(toolName, existing);
  }

  if (metrics.requests - lastMetricsLog >= 100) {
    logPerformanceMetrics();
    lastMetricsLog = metrics.requests;
  }
}

function createObservedCache(cache: Cache, onHit: () => void): Cache {
  const observed: Cache = {
    get: async <T = unknown>(key: string): Promise<T | null> => {
      const value = await cache.get<T>(key);
      if (value !== null && value !== undefined) {
        onHit();
      }
      return value;
    },
    set: <T = unknown>(key: string, data: T): Promise<void> | void => cache.set(key, data),
  };
  if (cache.clear) {
    observed.clear = () => cache.clear!();
  }
  return observed;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * All registered tool definitions (for MCP server listing).
 */
export const TOOL_DEFINITIONS = getToolDefinitions();

/**
 * Execute a tool by name with correlation tracing and RED + cache-hit metrics.
 */
export async function executeTool(
  name: string,
  args: unknown,
  apiConfig: ApiConfig,
  cache?: Cache,
  context?: ToolExecutionContext,
): Promise<LookupResult> {
  const startTime = Date.now();
  const requestContext = context?.requestContext ?? new RequestContext(context?.requestId);
  let cacheHit = false;
  const observedCache = cache
    ? createObservedCache(cache, () => {
        cacheHit = true;
      })
    : undefined;

  try {
    const result = await executeRegisteredTool(name, args, apiConfig, observedCache, {
      ...context,
      requestId: requestContext.requestId,
      requestContext,
    });
    const elapsedMs = Date.now() - startTime;
    recordMetrics(elapsedMs, cacheHit, !result.ok, name);
    if (result.ok) {
      toolsLogger.debug(
        "tool.executed",
        { tool: name, ok: true, cacheHit, elapsedMs },
        requestContext.requestId,
      );
    } else {
      toolsLogger.warn(
        "tool.failed",
        {
          tool: name,
          ok: false,
          cacheHit,
          elapsedMs,
          error: maskSensitiveText(result.error || "unknown error"),
        },
        requestContext.requestId,
      );
    }
    return result;
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    recordMetrics(elapsedMs, false, true, name);
    const errMsg = err instanceof Error ? err.message : String(err);
    toolsLogger.error(
      "tool.exception",
      {
        tool: name,
        elapsedMs,
        error: maskSensitiveText(errMsg),
      },
      requestContext.requestId,
    );
    throw err;
  }
}

export function getMetrics(): Metrics {
  return { ...metrics };
}

export function getToolMetrics(): Record<string, ToolMetrics> {
  const snapshot: Record<string, ToolMetrics> = {};
  for (const [name, entry] of toolMetrics.entries()) {
    snapshot[name] = {
      requests: entry.requests,
      errors: entry.errors,
      cacheHits: entry.cacheHits,
      totalTimeMs: entry.totalTimeMs,
      avgTimeMs: entry.requests > 0 ? Math.round(entry.totalTimeMs / entry.requests) : 0,
      maxTimeMs: entry.maxTimeMs,
    };
  }
  return snapshot;
}

export function resetMetrics(): void {
  metrics = {
    requests: 0,
    cacheHits: 0,
    errors: 0,
    totalTime: 0,
    startTime: Date.now(),
  };
  lastMetricsLog = 0;
  toolMetrics.clear();
}
