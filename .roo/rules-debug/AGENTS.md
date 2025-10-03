# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Debugging Environment

- **DISABLE_THOUGHT_LOGGING**: Environment variable to suppress sequential thinking output to stderr
- **MCP_CACHE_BACKGROUND_CLEANUP**: Opt-in flag (set to "true") enables automatic cache cleanup in [`lib/core/cache.ts`](lib/core/cache.ts:20-22)

## State Management Issues

- **New server per SSE connection**: Each SSE connection creates new MCP server instance - metrics don't accumulate across connections
- **Metrics reset**: Calling `resetMetrics()` in [`lib/core/tools.ts`](lib/core/tools.ts:237-244) wipes all performance data
- **Global circuit breaker**: Single circuit breaker instance in [`lib/infrastructure/http/circuit-breaker.ts`](lib/infrastructure/http/circuit-breaker.ts:6-10) means one failing API blocks all others

## Timeout Behavior

- **Intelligence operations**: Use `Promise.race()` not `AbortController` in [`lib/core/intelligence.ts`](lib/core/intelligence.ts:81) - operations continue running after timeout expires