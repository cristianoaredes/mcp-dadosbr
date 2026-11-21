/**
 * TypeScript types for Cloudflare Workers
 */

import type { DORK_CATEGORIES, SEARCH_PROVIDERS } from '../core/tool-schemas.js';

export type DorkCategory = typeof DORK_CATEGORIES[number];
export type SearchProvider = typeof SEARCH_PROVIDERS[number];

/**
 * Cloudflare ExecutionContext interface
 */
declare global {
  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}

/**
 * Worker exported handler type
 */
export type WorkerExportedHandler<Env = unknown> = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>;
};

/**
 * Search request body
 */
export interface SearchRequestBody {
  query: string;
  max_results?: number;
}

/**
 * Intelligence request body
 */
export interface IntelligenceRequestBody {
  cnpj: string;
  categories?: DorkCategory[];
  provider?: SearchProvider;
  max_results_per_query?: number;
  max_queries?: number;
  max_results?: number;
}

/**
 * Thinking request body
 */
export interface ThinkingRequestBody {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
}
