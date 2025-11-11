/**
 * Simple in-memory rate limiter for local instances
 * Prevents abuse of external APIs by limiting requests per client
 */

import { TIMEOUTS } from "../config/timeouts.js";

export interface RateLimiterConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window per client
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private clients = new Map<string, ClientRecord>();
  private config: RateLimiterConfig;

  constructor(config: RateLimiterConfig) {
    this.config = config;

    // Cleanup old entries periodically
    setInterval(() => this.cleanup(), TIMEOUTS.RATE_LIMIT_CLEANUP_MS);
  }

  /**
   * Check if client is within rate limit
   * @param clientId - Client identifier (usually IP address)
   * @returns true if request is allowed, false if rate limited
   */
  checkLimit(clientId: string): boolean {
    const now = Date.now();
    const record = this.clients.get(clientId);

    // No record or window expired - allow and create/reset
    if (!record || now >= record.resetTime) {
      this.clients.set(clientId, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    // Within window - check count
    if (record.count < this.config.maxRequests) {
      record.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  /**
   * Get remaining requests for a client
   * @param clientId - Client identifier
   * @returns number of remaining requests, or maxRequests if no record
   */
  getRemaining(clientId: string): number {
    const now = Date.now();
    const record = this.clients.get(clientId);

    if (!record || now >= record.resetTime) {
      return this.config.maxRequests;
    }

    return Math.max(0, this.config.maxRequests - record.count);
  }

  /**
   * Get time until reset for a client
   * @param clientId - Client identifier
   * @returns milliseconds until reset, or 0 if no limit
   */
  getResetTime(clientId: string): number {
    const now = Date.now();
    const record = this.clients.get(clientId);

    if (!record || now >= record.resetTime) {
      return 0;
    }

    return record.resetTime - now;
  }

  /**
   * Cleanup expired entries to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [clientId, record] of this.clients.entries()) {
      if (now >= record.resetTime) {
        this.clients.delete(clientId);
        cleanedCount++;
      }
    }

    // Only log cleanup in debug mode to avoid exposing client tracking info
    if (cleanedCount > 0 && process.env.NODE_ENV !== 'production') {
      console.error(`[RateLimiter] Cleaned up ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      activeClients: this.clients.size,
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests
    };
  }
}
