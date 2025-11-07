/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 *
 * Note: Timeouts are now in lib/config/timeouts.ts for better configurability
 */

export const RATE_LIMIT = {
  /** Tavily rate limit interval (none, API handles it) */
  TAVILY_INTERVAL_MS: 0,

  /** SerpAPI rate limit interval (none, API handles it) */
  SERPAPI_INTERVAL_MS: 0,
} as const;

export const CIRCUIT_BREAKER = {
  /** Number of failures before opening circuit */
  FAILURE_THRESHOLD: 5,

  /** Max attempts in HALF_OPEN state */
  HALF_OPEN_MAX_ATTEMPTS: 3,
} as const;

export const API_URLS = {
  /** Default CNPJ API base URL */
  DEFAULT_CNPJ: 'https://api.opencnpj.org/',
  
  /** Default CEP API base URL */
  DEFAULT_CEP: 'https://opencep.com/v1/',
} as const;

export const SERVER = {
  /** Server name */
  NAME: 'mcp-dadosbr',
  
  /** Server version */
  VERSION: '1.0.0',
  
  /** Default transport mode */
  DEFAULT_TRANSPORT: 'stdio',
  
  /** Default HTTP port */
  DEFAULT_HTTP_PORT: 3000,
} as const;

export const SEARCH = {
  /** Default max results for search queries */
  DEFAULT_MAX_RESULTS: 5,
  
  /** Maximum allowed results per query */
  MAX_RESULTS_LIMIT: 20,
  
  /** Default max queries for intelligence */
  DEFAULT_MAX_QUERIES: 10,
  
  /** Maximum allowed queries */
  MAX_QUERIES_LIMIT: 20,
} as const;

export const CACHE = {
  /** Default cache size (number of entries) */
  DEFAULT_SIZE: 256,

  /** Default cache TTL in milliseconds (1 hour) */
  DEFAULT_TTL_MS: 60 * 60 * 1000,

  /** Background cleanup interval in milliseconds (5 minutes) */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,
} as const;

export const LOGGING = {
  /** Default log level */
  DEFAULT_LEVEL: 'info' as const,

  /** Whether to sanitize PII by default */
  DEFAULT_SANITIZE: true,

  /** Whether to pretty print logs by default */
  DEFAULT_PRETTY_PRINT: false,
} as const;
