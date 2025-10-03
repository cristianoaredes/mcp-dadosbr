# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Type System Patterns

- **Cache interface**: Uses sync/async union types in [`lib/types/index.ts`](lib/types/index.ts:58) - both `Promise<T> | T` allowed
- **Result<T,E> type**: Exists in [`lib/shared/types/result.ts`](lib/shared/types/result.ts) but underutilized - most code uses plain objects with `{ ok: boolean; data?: T; error?: string }`
- **Validation transforms**: Zod schemas in [`lib/core/validation.ts`](lib/core/validation.ts:12-15) transform input via `.transform()` - side effects, not just validation

## Implementation Details

- **URL normalization**: Auto-adds trailing slash in [`lib/config/index.ts`](lib/config/index.ts:23-25) - don't manually add
- **Dynamic import**: Intelligence feature uses `await import('./intelligence.js')` in [`lib/core/tools.ts`](lib/core/tools.ts:222) to avoid circular dependencies
- **KVCache storage**: Stores redundant expiry timestamps in [`lib/core/cache.ts`](lib/core/cache.ts:131-137) - not using KV native TTL