/**
 * TypeScript types for Cloudflare Workers
 */

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
  categories?: string[];
  max_results_per_query?: number;
  max_queries?: number;
}

/**
 * Thinking request body
 */
export interface ThinkingRequestBody {
  thought: string;
  context?: string;
}
