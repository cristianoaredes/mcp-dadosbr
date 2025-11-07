import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { HttpResponse } from "../types/index.js";
import { CircuitBreaker } from "../infrastructure/http/circuit-breaker.js";
import { TIMEOUTS } from "../config/timeouts.js";

// Global circuit breaker instance for HTTP requests
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS,
  halfOpenMaxAttempts: 3,
});

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const RETRY_STATUS_CODES = new Set([429, 502, 503, 504]);

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute HTTP request with exponential backoff retry
 */
async function executeWithRetry(
  fn: () => Promise<HttpResponse>,
  maxRetries: number = MAX_RETRIES
): Promise<HttpResponse> {
  let lastError: HttpResponse | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();

    // Success - return immediately
    if (result.ok) {
      return result;
    }

    // Check if error is retryable
    const isRetryable = result.error && (
      result.error.includes('rate limited') ||
      result.error.includes('temporarily unavailable') ||
      result.error.includes('network error')
    );

    // If not retryable or last attempt, return error
    if (!isRetryable || attempt === maxRetries) {
      return result;
    }

    // Calculate exponential backoff delay: 1s, 2s, 4s
    const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
    await sleep(delayMs);

    lastError = result;
  }

  return lastError!;
}

export async function httpJson(
  url: string,
  authHeaders?: Record<string, string>,
  timeoutMs = TIMEOUTS.HTTP_REQUEST_MS
): Promise<HttpResponse> {
  return await executeWithRetry(async () => {
    return await circuitBreaker.execute(async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        "User-Agent": `${SERVER_NAME}/${SERVER_VERSION}`,
        ...authHeaders,
      };

      const response = await fetch(url, {
        signal: controller.signal,
        headers,
      });

      if (!response.ok) {
        const errorMap: Record<number, string> = {
          404: "not found",
          429: "rate limited",
          500: "service temporarily unavailable",
          502: "service temporarily unavailable",
          503: "service temporarily unavailable",
          504: "service temporarily unavailable",
        };
        return {
          ok: false,
          error: errorMap[response.status] || `HTTP ${response.status}`,
          source: url,
        };
      }
      return { ok: true, data: await response.json(), source: url };
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === "AbortError") {
        return {
          ok: false,
          error: "request timeout after 8 seconds",
          source: url,
        };
      }
      if (err.message?.includes("fetch")) {
        return { ok: false, error: "network error", source: url };
      }
      return { ok: false, error: "unknown error", source: url };
    }
    });
  });
}
