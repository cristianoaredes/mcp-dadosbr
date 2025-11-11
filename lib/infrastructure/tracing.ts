/**
 * Request tracing and correlation ID management
 * Enables tracking requests across the system
 */

import { createLogger } from './logger.js';

const logger = createLogger('tracing');

/**
 * Generate a unique request ID for tracing
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `req_${timestamp}_${random}`;
}

/**
 * Request context for tracing
 * Carries request ID and metadata throughout the request lifecycle
 */
export class RequestContext {
  public readonly requestId: string;
  public readonly startTime: number;
  private metadata: Record<string, unknown>;

  constructor(requestId?: string) {
    this.requestId = requestId || generateRequestId();
    this.startTime = Date.now();
    this.metadata = {};
  }

  /**
   * Add metadata to the request context
   */
  addMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  /**
   * Get metadata from the request context
   */
  getMetadata(key: string): unknown {
    return this.metadata[key];
  }

  /**
   * Get all metadata
   */
  getAllMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  /**
   * Get elapsed time since request started
   */
  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Log with request context
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void {
    const fullContext = {
      ...this.metadata,
      ...context,
      elapsedMs: this.getElapsedMs(),
    };
    logger[level](message, fullContext, this.requestId);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('error', message, context);
  }
}

/**
 * Extract request ID from HTTP headers
 */
export function extractRequestId(headers: Record<string, string | string[] | undefined>): string | undefined {
  const headerId = headers['x-request-id'] || headers['X-Request-Id'];
  return typeof headerId === 'string' ? headerId : undefined;
}
