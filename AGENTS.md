# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build System

- **Dual build targets**: Use `npm run build` for Node.js (uses [`tsconfig.json`](tsconfig.json)) or `npm run build:worker` for Cloudflare Workers (uses [`tsconfig.worker.json`](tsconfig.worker.json))
- **ESM imports**: All imports must use `.js` extensions even for `.ts` source files due to ESM module resolution

## Testing

- **Integration tests**: Plain Node.js scripts, NOT Vitest - run with `npm run test:integration`
- **Test scripts**: Located in [`test/integration/`](test/integration/) and executed directly with node

## Logging

- **Critical**: ALL logging MUST use `console.error()` instead of `console.log()` - stdout is reserved for JSON-RPC protocol communication
- **Thought logging**: Can be disabled with `DISABLE_THOUGHT_LOGGING=true` environment variable

## Configuration

- **Hierarchy**: Environment variables override [`.mcprc.json`](.mcprc.json) which overrides defaults (see [`lib/config/index.ts`](lib/config/index.ts:28-82))
- **Location matters**: `.mcprc.json` must be in current working directory, not necessarily project root

## Rate Limiting & Resilience

- **DuckDuckGo**: 3-second rate limit between requests with automatic fallback to Tavily (see [`lib/core/search-providers.ts`](lib/core/search-providers.ts:35))
- **Circuit breaker**: Global singleton at [`lib/infrastructure/http/circuit-breaker.ts`](lib/infrastructure/http/circuit-breaker.ts) - 5 failures blocks ALL HTTP requests for 30 seconds
- **Request deduplication**: Prevents concurrent identical API calls in [`lib/core/tools.ts`](lib/core/tools.ts:41-49) - second request waits for first to complete

## Intelligence

- **Timeout**: 25 seconds total for intelligence operations in [`lib/core/intelligence.ts`](lib/core/intelligence.ts:39)
- **Metrics**: Logged every 10 requests, not continuously (see [`lib/core/tools.ts`](lib/core/tools.ts:35))