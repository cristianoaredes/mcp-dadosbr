# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

MCP server providing tools for querying Brazilian public data APIs (CNPJ, CEP, etc.) with optional web intelligence features. Supports multiple deployment targets: CLI/stdio, HTTP/SSE, and Cloudflare Workers.

## Critical Logging Requirement

**ALL logging MUST use `console.error()` instead of `console.log()`** - stdout is reserved for JSON-RPC protocol communication. This is non-negotiable.

**BUG**: [`lib/core/tools.ts`](lib/core/tools.ts:71-73) incorrectly uses `console.log()` and should be fixed.

## ESM Module Resolution

All imports MUST use `.js` extensions even for `.ts` source files due to ESM module resolution requirements (e.g., `import { foo } from './bar.js'` not `'./bar.ts'`).

## Testing Requirements

- **Integration tests**: Plain Node.js scripts, NOT Vitest - located in [`test/integration/`](test/integration/)
- **Must run after build**: Integration tests execute against `build/` directory, so run `npm run build` first
- **Unit tests**: Use Vitest (separate from integration tests)

## Configuration System

- **`.mcprc.json` location**: Must be in current working directory (CWD), not necessarily project root
- **Hierarchy**: Environment variables override `.mcprc.json` which overrides defaults

## HTTP Resilience

- **Circuit breaker**: Global singleton at [`lib/infrastructure/http/circuit-breaker.ts`](lib/infrastructure/http/circuit-breaker.ts) - 5 failures blocks ALL HTTP requests for 30 seconds
- **Request deduplication**: Concurrent identical API calls share same promise in [`lib/core/tools.ts`](lib/core/tools.ts:47-52) - second request waits for first to complete
- **Timeout bug**: [`lib/core/http-client.ts`](lib/core/http-client.ts:51) hardcodes "8 seconds" in error message despite configurable timeout parameter

## Search Providers

**DuckDuckGo provider REMOVED** - only Tavily supported. Provider factory in [`lib/core/search-providers.ts`](lib/core/search-providers.ts:106-113) throws error for non-Tavily providers.

## Intelligence Operations

- **Total timeout**: 25 seconds for entire intelligence operation in [`lib/core/intelligence.ts`](lib/core/intelligence.ts:65)
- **Timeout implementation**: Uses `Promise.race()` not `AbortController` - operations continue running in background after timeout
- **Post-filtering**: Results filtered by CNPJ presence in [`lib/core/intelligence.ts`](lib/core/intelligence.ts:52-58) after search completes

## Metrics & Monitoring

- **Logging frequency**: Every 10 requests in [`lib/core/tools.ts`](lib/core/tools.ts:37-41), not continuously
- **Metrics reset**: On every server creation via `resetMetrics()` function
- **Thought logging**: Sequential thinking logs to stderr, disable with `DISABLE_THOUGHT_LOGGING=true`