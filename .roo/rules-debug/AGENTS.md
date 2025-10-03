# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Logging Requirements

- **Critical**: ALL logs MUST go to stderr (`console.error()`) - stdout is reserved for JSON-RPC protocol communication
- **Thought logging**: Can be disabled with `DISABLE_THOUGHT_LOGGING=true` environment variable
- **Metrics**: Logged every 10 requests in [`lib/core/tools.ts`](lib/core/tools.ts:35) - not continuously

## Resilience & Timeouts

- **Circuit breaker**: Located at [`lib/infrastructure/http/circuit-breaker.ts`](lib/infrastructure/http/circuit-breaker.ts) - 5 failures blocks ALL HTTP requests for 30 seconds
- **Intelligence timeout**: 25 seconds total for intelligence operations in [`lib/core/intelligence.ts`](lib/core/intelligence.ts:39)
- **DuckDuckGo rate limit**: 3 seconds between requests in [`lib/core/search-providers.ts`](lib/core/search-providers.ts:35)

## Testing

- **Integration tests**: Run with node, NOT vitest - check [`package.json`](package.json:24) scripts
- **Test execution**: Plain Node.js scripts in [`test/integration/`](test/integration/) directory

## Common Debugging Points

- **Request deduplication**: Second identical request waits for first in [`lib/core/tools.ts`](lib/core/tools.ts:41-49)
- **Search fallback**: Automatic Tavily fallback when DuckDuckGo fails in [`lib/core/search-providers.ts`](lib/core/search-providers.ts:229-269)
- **Global circuit breaker**: Single instance affects ALL HTTP requests, not per-endpoint