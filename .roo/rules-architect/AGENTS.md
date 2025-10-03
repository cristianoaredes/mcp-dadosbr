# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Deployment Architecture

- **Cloudflare adapter divergence**: Completely different implementation in [`lib/adapters/cloudflare.ts`](lib/adapters/cloudflare.ts) - no MCP SDK usage, manual JSON-RPC protocol handling
- **New server per SSE**: Each SSE connection creates new MCP server instance - no state sharing between connections

## Global State Patterns

- **Circuit breaker scope**: Global singleton in [`lib/infrastructure/http/circuit-breaker.ts`](lib/infrastructure/http/circuit-breaker.ts:6-10) affects ALL HTTP requests system-wide, not per-endpoint or per-service
- **Request deduplication**: Implemented at tool execution level in [`lib/core/tools.ts`](lib/core/tools.ts:47-52) - concurrent identical calls share same promise across entire system

## Cache Implementations

- **Dual cache system**: 
  - `MemoryCache` in [`lib/core/cache.ts`](lib/core/cache.ts:4-113) - synchronous methods despite async interface
  - `KVCache` in [`lib/core/cache.ts`](lib/core/cache.ts:116-144) - truly asynchronous
- Both implement same `Cache` interface with union return types `Promise<T> | T` in [`lib/types/index.ts`](lib/types/index.ts:58-60)