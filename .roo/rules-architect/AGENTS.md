# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Architectural Patterns

- **Adapter pattern**: Located in [`lib/adapters/`](lib/adapters/) - same core logic, three deployment targets (CLI, Cloudflare Workers, Smithery)
- **Circuit breaker**: GLOBAL SINGLETON pattern - all HTTP requests share same state, not per-endpoint or per-request
- **Request deduplication**: Implemented at tool level - identical concurrent requests share same promise to prevent duplicate API calls

## Search Architecture

- **Provider fallback chain**: Defined in [`lib/core/search-providers.ts`](lib/core/search-providers.ts:229-269) - automatic fallback from Tavily to DuckDuckGo
- **Rate limiting**: DuckDuckGo has 3-second minimum delay between requests, enforced at provider level

## Cache Abstraction

- **Dual implementation**: [`lib/core/cache.ts`](lib/core/cache.ts) provides unified async interface for:
  - `MemoryCache`: Synchronous in-memory storage (Node.js)
  - `KVCache`: Asynchronous Cloudflare KV storage (Workers)
- Both expose same async API despite different underlying mechanisms

## Module System

- **ESM structure**: All imports must use `.js` extensions even for `.ts` source files
- **TypeScript moduleResolution**: Differs by target - "node" for Node.js builds, "bundler" for Cloudflare Workers

## Multi-Platform Support

- **Build targets**: Separate TypeScript configs for Node.js ([`tsconfig.json`](tsconfig.json)) and Workers ([`tsconfig.worker.json`](tsconfig.worker.json))
- **Entry points**: Different adapters in [`lib/adapters/`](lib/adapters/) handle platform-specific initialization
- **Shared core**: Business logic in [`lib/core/`](lib/core/) remains platform-agnostic