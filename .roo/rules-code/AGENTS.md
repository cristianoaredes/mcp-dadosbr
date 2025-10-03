# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Type System Patterns

- **Result<T,E> type**: Rust-inspired error handling pattern in [`lib/shared/types/result.ts`](lib/shared/types/result.ts:6-8) - use for explicit error handling instead of exceptions
- **Zod schemas**: Use transform in [`lib/core/validation.ts`](lib/core/validation.ts) to normalize data before validation

## Request Handling

- **Request deduplication**: Implemented in [`lib/core/tools.ts`](lib/core/tools.ts:41-49) - second request waits for first to complete, prevents duplicate API calls
- **Circuit breaker singleton**: Located in [`lib/core/http-client.ts`](lib/core/http-client.ts:6) - shared across ALL HTTP requests, not per-request

## Cache Implementations

- **Dual cache system**: [`lib/core/cache.ts`](lib/core/cache.ts) provides two implementations:
  - `MemoryCache`: Synchronous in-memory cache for Node.js
  - `KVCache`: Asynchronous Cloudflare KV storage for Workers
- Both implement same async interface despite different underlying mechanisms

## Configuration

- **URL normalization**: Automatically adds trailing slash in [`lib/config/index.ts`](lib/config/index.ts:23-25) - don't add manually
- **Config hierarchy**: Environment variables always override `.mcprc.json` which overrides defaults

## Module System

- **ESM requirement**: All imports must use `.js` extensions even for `.ts` source files
- **Example**: `import { foo } from './bar.js'` not `'./bar'` or `'./bar.ts'`