/**
 * Rate limiting middleware for Cloudflare Workers.
 *
 * NOTE (eventual consistency): Cloudflare Workers KV does not guarantee atomic
 * read-modify-write/INCR across edge POPs under concurrent bursts. Fixed-window
 * buckets + mandatory expirationTtl (>= 60s) make KV rate limiting best-effort
 * and self-cleaning; strict global enforcement requires Cloudflare's native
 * Rate Limiting binding or Durable Objects.
 */

import { Env, corsHeaders } from "../adapters/cloudflare.js";
import { MIN_KV_EXPIRATION_TTL_SECONDS } from "../core/cache.js";
import { TIMEOUTS } from "../config/timeouts.js";
import { createLogger } from "../infrastructure/logger.js";
import type { RequestContext } from "../infrastructure/tracing.js";
import { maskSensitiveText } from "../shared/log-redaction.js";

const rateLimitLogger = createLogger("worker-rate-limit");

const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window per IP
const CLIENT_ID_REGEX = /^[A-Za-z0-9.:_-]{1,64}$/;

export interface RateLimitResult {
  allowed: boolean;
  error?: Response;
}

/**
 * Extract a trusted client identifier for Worker rate limiting.
 * Prefers Cloudflare Edge `CF-Connecting-IP`; ignores spoofable `X-Forwarded-For`
 * unless `env.MCP_TRUST_X_FORWARDED_FOR === "true"`.
 */
export function extractClientIdentifier(request: Request, env: Env): string {
  const cfIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cfIp && CLIENT_ID_REGEX.test(cfIp)) {
    return cfIp;
  }

  if (env.MCP_TRUST_X_FORWARDED_FOR === "true") {
    const xff = request.headers.get("X-Forwarded-For");
    const firstIp = xff?.split(",")[0]?.trim();
    if (firstIp && CLIENT_ID_REGEX.test(firstIp)) {
      return firstIp;
    }
  }

  return "unknown";
}

/**
 * Check rate limit for incoming request
 * Uses Cloudflare KV for best-effort distributed rate limiting with fixed-window keys
 */
export async function checkRateLimit(
  request: Request,
  env: Env,
  requestContext?: RequestContext
): Promise<RateLimitResult> {
  // Skip rate limiting for health checks
  const url = new URL(request.url);
  if (url.pathname === "/health") {
    return { allowed: true };
  }

  // Skip rate limiting if disabled
  if (env.MCP_DISABLE_RATE_LIMIT === "true") {
    return { allowed: true };
  }

  const clientIP = extractClientIdentifier(request, env);

  // If no KV namespace available, allow request (rate limiting optional)
  if (!env.MCP_KV) {
    return { allowed: true };
  }

  const windowMs = TIMEOUTS.RATE_LIMIT_WINDOW_MS;
  const now = Date.now();
  const windowBucket = Math.floor(now / windowMs);
  const windowStart = windowBucket * windowMs;
  const resetTime = windowStart + windowMs;
  const key = `rate_limit:${clientIP}:${windowBucket}`;
  const expirationTtl = Math.max(
    MIN_KV_EXPIRATION_TTL_SECONDS,
    Math.ceil(windowMs / 1000) * 2
  );

  try {
    const data = await env.MCP_KV.get(key);
    let requestCount = 0;

    if (data) {
      try {
        const parsed = JSON.parse(data) as { count?: unknown } | null;
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.count === "number" &&
          Number.isFinite(parsed.count) &&
          parsed.count >= 0
        ) {
          requestCount = parsed.count;
        }
      } catch {
        // Ignore corrupted JSON in KV bucket and start counter cleanly
        requestCount = 0;
      }
    }

    requestCount += 1;

    // Check if limit exceeded
    if (requestCount > RATE_LIMIT_MAX_REQUESTS) {
      const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        error: new Response(
          JSON.stringify({
            error: "Rate Limit Exceeded",
            message: `Too many requests. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${windowMs / 1000} seconds.`,
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": retryAfter.toString(),
              "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(),
              ...corsHeaders,
            },
          }
        ),
      };
    }

    // Persist bucket counter with mandatory expirationTtl (>= 60s)
    await env.MCP_KV.put(
      key,
      JSON.stringify({
        count: requestCount,
        windowStart,
      }),
      { expirationTtl }
    );

    return { allowed: true };
  } catch (error) {
    // On KV transport error, allow request (fail open)
    rateLimitLogger.error(
      "rate_limit.check_failed",
      {
        error: maskSensitiveText(
          error instanceof Error ? error.message : String(error)
        ),
      },
      requestContext?.requestId
    );
    return { allowed: true };
  }
}
