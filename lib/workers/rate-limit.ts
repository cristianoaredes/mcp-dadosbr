/**
 * Rate limiting middleware for Cloudflare Workers
 */

import { Env } from "../adapters/cloudflare.js";
import { corsHeaders } from "../adapters/cloudflare.js";
import { TIMEOUTS } from "../config/timeouts.js";

const RATE_LIMIT_WINDOW = TIMEOUTS.RATE_LIMIT_WINDOW_MS;
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window per IP

export interface RateLimitResult {
  allowed: boolean;
  error?: Response;
}

/**
 * Check rate limit for incoming request
 * Uses Cloudflare KV for distributed rate limiting
 */
export async function checkRateLimit(
  request: Request,
  env: Env
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

  const clientIP =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  // If no KV namespace available, allow request (rate limiting optional)
  if (!env.MCP_KV) {
    return { allowed: true };
  }

  const key = `rate_limit:${clientIP}`;
  const now = Date.now();

  try {
    const data = await env.MCP_KV.get(key);
    let requestCount = 0;
    let windowStart = now;

    if (data) {
      const parsed = JSON.parse(data);
      requestCount = parsed.count || 0;
      windowStart = parsed.windowStart || now;
    }

    // Check if window has expired
    if (now - windowStart > RATE_LIMIT_WINDOW) {
      // Reset window
      requestCount = 1;
      windowStart = now;
    } else {
      requestCount += 1;
    }

    // Check if limit exceeded
    if (requestCount > RATE_LIMIT_MAX_REQUESTS) {
      const resetTime = windowStart + RATE_LIMIT_WINDOW;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        error: new Response(
          JSON.stringify({
            error: "Rate Limit Exceeded",
            message: `Too many requests. Maximum ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW / 1000} seconds.`,
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

    // Update rate limit data
    await env.MCP_KV.put(
      key,
      JSON.stringify({
        count: requestCount,
        windowStart,
      })
    );

    return { allowed: true };
  } catch (error) {
    // On error, allow request (fail open)
    console.error("Rate limit check failed:", error);
    return { allowed: true };
  }
}
