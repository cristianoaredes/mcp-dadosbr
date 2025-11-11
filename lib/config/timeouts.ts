/**
 * Centralized timeout configuration
 * All timeouts can be configured via environment variables
 */

/**
 * Get timeout value from environment or use default
 * @param envVar - Environment variable name
 * @param defaultValue - Default value in milliseconds
 * @returns Timeout in milliseconds
 */
function getTimeoutMs(envVar: string, defaultValue: number): number {
  const value = process.env[envVar];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`[Config] Invalid timeout value for ${envVar}: ${value}, using default: ${defaultValue}ms`);
    return defaultValue;
  }

  return parsed;
}

/**
 * Centralized timeout configuration object
 * All values are lazy-loaded from environment variables
 */
export const TIMEOUTS = {
  /**
   * HTTP request timeout for external API calls (CNPJ, CEP)
   * Default: 8000ms (8 seconds)
   * Env: MCP_API_TIMEOUT
   */
  get HTTP_REQUEST_MS(): number {
    return getTimeoutMs('MCP_API_TIMEOUT', 8000);
  },

  /**
   * Total timeout for intelligence search operations
   * Default: 25000ms (25 seconds)
   * Env: MCP_INTELLIGENCE_TIMEOUT
   */
  get INTELLIGENCE_TOTAL_MS(): number {
    return getTimeoutMs('MCP_INTELLIGENCE_TIMEOUT', 25000);
  },

  /**
   * Timeout for individual search requests
   * Default: 10000ms (10 seconds)
   * Env: MCP_SEARCH_TIMEOUT
   */
  get SEARCH_REQUEST_MS(): number {
    return getTimeoutMs('MCP_SEARCH_TIMEOUT', 10000);
  },

  /**
   * Timeout for request deduplication
   * Default: 30000ms (30 seconds)
   * Env: MCP_DEDUP_TIMEOUT
   */
  get DEDUP_TIMEOUT_MS(): number {
    return getTimeoutMs('MCP_DEDUP_TIMEOUT', 30000);
  },

  /**
   * Circuit breaker reset timeout
   * Default: 30000ms (30 seconds)
   * Env: MCP_CIRCUIT_BREAKER_TIMEOUT
   */
  get CIRCUIT_BREAKER_RESET_MS(): number {
    return getTimeoutMs('MCP_CIRCUIT_BREAKER_TIMEOUT', 30000);
  },

  /**
   * SSE connection timeout (Cloudflare Workers)
   * Default: 300000ms (5 minutes)
   * Env: MCP_SSE_TIMEOUT
   */
  get SSE_CONNECTION_MS(): number {
    return getTimeoutMs('MCP_SSE_TIMEOUT', 300000);
  },

  /**
   * Ping interval for worker keep-alive
   * Default: 30000ms (30 seconds)
   * Env: MCP_PING_INTERVAL
   */
  get PING_INTERVAL_MS(): number {
    return getTimeoutMs('MCP_PING_INTERVAL', 30000);
  },

  /**
   * Rate limiter cleanup interval
   * Default: 60000ms (1 minute)
   * Env: MCP_RATE_LIMIT_CLEANUP_INTERVAL
   */
  get RATE_LIMIT_CLEANUP_MS(): number {
    return getTimeoutMs('MCP_RATE_LIMIT_CLEANUP_INTERVAL', 60000);
  },

  /**
   * Rate limit window duration
   * Default: 60000ms (1 minute)
   * Env: MCP_RATE_LIMIT_WINDOW
   */
  get RATE_LIMIT_WINDOW_MS(): number {
    return getTimeoutMs('MCP_RATE_LIMIT_WINDOW', 60000);
  },
};

/**
 * Log current timeout configuration (useful for debugging)
 * Only logs in debug mode (NODE_ENV !== 'production')
 */
export function logTimeoutConfig(): void {
  // Only log in non-production environments
  if (process.env.NODE_ENV === 'production') return;

  console.error('[Config] Timeout configuration:');
  console.error(`  HTTP_REQUEST_MS: ${TIMEOUTS.HTTP_REQUEST_MS}ms`);
  console.error(`  INTELLIGENCE_TOTAL_MS: ${TIMEOUTS.INTELLIGENCE_TOTAL_MS}ms`);
  console.error(`  SEARCH_REQUEST_MS: ${TIMEOUTS.SEARCH_REQUEST_MS}ms`);
  console.error(`  DEDUP_TIMEOUT_MS: ${TIMEOUTS.DEDUP_TIMEOUT_MS}ms`);
  console.error(`  CIRCUIT_BREAKER_RESET_MS: ${TIMEOUTS.CIRCUIT_BREAKER_RESET_MS}ms`);
  console.error(`  SSE_CONNECTION_MS: ${TIMEOUTS.SSE_CONNECTION_MS}ms`);
  console.error(`  PING_INTERVAL_MS: ${TIMEOUTS.PING_INTERVAL_MS}ms`);
  console.error(`  RATE_LIMIT_CLEANUP_MS: ${TIMEOUTS.RATE_LIMIT_CLEANUP_MS}ms`);
  console.error(`  RATE_LIMIT_WINDOW_MS: ${TIMEOUTS.RATE_LIMIT_WINDOW_MS}ms`);
}
