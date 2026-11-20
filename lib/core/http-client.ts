import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { TIMEOUTS } from "../config/timeouts.js";
import { CircuitBreaker, CircuitBreakerOpenError } from "../infrastructure/http/circuit-breaker.js";
import { HttpResponse } from "../types/index.js";

const MAX_CIRCUIT_BREAKERS = 100;
const circuitBreakers = new Map<string, CircuitBreaker>();

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
export const RETRY_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export interface HttpJsonOptions {
  noContent?: unknown;
  maxRetries?: number;
  initialRetryDelayMs?: number;
  random?: () => number;
}

class TransientHttpError extends Error {
  constructor(
    public readonly response: HttpResponse,
    public readonly retryable: boolean,
  ) {
    super(response.error ?? "transient http error");
    this.name = "TransientHttpError";
  }
}

interface AttemptOutcome {
  response: HttpResponse;
  retryable: boolean;
}

function createUpstreamBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: TIMEOUTS.CIRCUIT_BREAKER_RESET_MS,
    halfOpenMaxAttempts: 3,
  });
}

/**
 * Normalize a request URL into an isolated circuit breaker key (lowercase origin).
 */
export function getUpstreamKey(url: string): string {
  const parsed = new URL(url);
  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.origin === "null") {
    throw new TypeError(`Unsupported URL protocol: ${parsed.protocol}`);
  }
  return parsed.origin.toLowerCase();
}

function getOrCreateCircuitBreaker(origin: string): CircuitBreaker {
  const existing = circuitBreakers.get(origin);
  if (existing) {
    // Refresh insertion order for LRU eviction.
    circuitBreakers.delete(origin);
    circuitBreakers.set(origin, existing);
    return existing;
  }

  if (circuitBreakers.size >= MAX_CIRCUIT_BREAKERS) {
    let victimKey: string | undefined;
    for (const [key, breaker] of circuitBreakers.entries()) {
      if (breaker.getState() === "CLOSED") {
        victimKey = key;
        break;
      }
    }
    if (victimKey === undefined) {
      victimKey = circuitBreakers.keys().next().value;
    }
    if (victimKey !== undefined) {
      circuitBreakers.delete(victimKey);
    }
  }

  const breaker = createUpstreamBreaker();
  circuitBreakers.set(origin, breaker);
  return breaker;
}

export function getCircuitBreaker(urlOrOrigin: string): CircuitBreaker {
  return getOrCreateCircuitBreaker(getUpstreamKey(urlOrOrigin));
}

export function getCircuitBreakerMetrics(): Record<string, ReturnType<CircuitBreaker["getMetrics"]>> {
  const metrics: Record<string, ReturnType<CircuitBreaker["getMetrics"]>> = {};
  for (const [origin, breaker] of circuitBreakers.entries()) {
    metrics[origin] = breaker.getMetrics();
  }
  return metrics;
}

export function resetCircuitBreakers(): void {
  circuitBreakers.clear();
}

export function formatTimeoutMessage(timeoutMs: number): string {
  const seconds = Number((timeoutMs / 1000).toFixed(3));
  return `request timeout after ${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

/**
 * Equal jitter backoff: [baseDelay / 2, baseDelay] using a single PRNG sample.
 */
export function calculateBackoffDelayMs(
  attempt: number,
  initialDelayMs: number = INITIAL_RETRY_DELAY_MS,
  random: () => number = Math.random,
): number {
  const baseDelay = initialDelayMs * Math.pow(2, attempt);
  const half = baseDelay / 2;
  const raw = random();
  const r = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.5;
  return Math.round(half + r * half);
}

function isAbortOrTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeWithRetry(
  fn: () => Promise<AttemptOutcome>,
  shouldStopRetrying: () => boolean,
  maxRetries: number,
  initialRetryDelayMs: number,
  random: () => number,
): Promise<HttpResponse> {
  let lastResponse: HttpResponse | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const outcome = await fn();

    if (outcome.response.ok || !outcome.retryable || shouldStopRetrying() || attempt === maxRetries) {
      return outcome.response;
    }

    lastResponse = outcome.response;
    const delayMs = calculateBackoffDelayMs(attempt, initialRetryDelayMs, random);
    await sleep(delayMs);
  }

  return lastResponse!;
}

export async function httpJson(
  url: string,
  authHeaders?: Record<string, string>,
  timeoutMs = TIMEOUTS.HTTP_REQUEST_MS,
  options?: HttpJsonOptions,
): Promise<HttpResponse> {
  let origin: string;
  try {
    origin = getUpstreamKey(url);
  } catch {
    return { ok: false, error: "invalid url", source: url };
  }

  const effectiveTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : TIMEOUTS.HTTP_REQUEST_MS;
  const maxRetries =
    options?.maxRetries !== undefined && Number.isFinite(options.maxRetries) && options.maxRetries >= 0
      ? Math.floor(options.maxRetries)
      : MAX_RETRIES;
  const initialRetryDelayMs =
    options?.initialRetryDelayMs !== undefined &&
    Number.isFinite(options.initialRetryDelayMs) &&
    options.initialRetryDelayMs >= 0
      ? options.initialRetryDelayMs
      : INITIAL_RETRY_DELAY_MS;
  const random = options?.random ?? Math.random;

  const breaker = getOrCreateCircuitBreaker(origin);

  const runAttempt = async (): Promise<AttemptOutcome> => {
    try {
      const response = await breaker.execute(async (): Promise<HttpResponse> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);
        try {
          const headers: Record<string, string> = {
            "User-Agent": `${SERVER_NAME}/${SERVER_VERSION}`,
            ...authHeaders,
          };

          let fetchResponse: Response;
          try {
            fetchResponse = await fetch(url, {
              signal: controller.signal,
              headers,
            });
          } catch (error: unknown) {
            if (isAbortOrTimeoutError(error)) {
              throw new TransientHttpError(
                { ok: false, error: formatTimeoutMessage(effectiveTimeoutMs), source: url },
                false,
              );
            }
            throw new TransientHttpError({ ok: false, error: "network error", source: url }, true);
          }

          if (!fetchResponse.ok) {
            const errorMap: Record<number, string> = {
              404: "not found",
              429: "rate limited",
              500: "service temporarily unavailable",
              502: "service temporarily unavailable",
              503: "service temporarily unavailable",
              504: "service temporarily unavailable",
            };
            const httpResponse: HttpResponse = {
              ok: false,
              error: errorMap[fetchResponse.status] || `HTTP ${fetchResponse.status}`,
              source: url,
            };
            if (RETRY_STATUS_CODES.has(fetchResponse.status) || fetchResponse.status >= 500) {
              throw new TransientHttpError(httpResponse, RETRY_STATUS_CODES.has(fetchResponse.status));
            }
            return httpResponse;
          }

          try {
            const data =
              fetchResponse.status === 204 && options && "noContent" in options
                ? options.noContent
                : await fetchResponse.json();
            return { ok: true, data, source: url };
          } catch (error: unknown) {
            if (isAbortOrTimeoutError(error)) {
              throw new TransientHttpError(
                { ok: false, error: formatTimeoutMessage(effectiveTimeoutMs), source: url },
                false,
              );
            }
            throw new TransientHttpError({ ok: false, error: "unknown error", source: url }, false);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      });

      return { response, retryable: false };
    } catch (error: unknown) {
      if (error instanceof CircuitBreakerOpenError) {
        return {
          response: { ok: false, error: error.message, source: url },
          retryable: false,
        };
      }
      if (error instanceof TransientHttpError) {
        return { response: error.response, retryable: error.retryable };
      }
      return {
        response: { ok: false, error: "unknown error", source: url },
        retryable: false,
      };
    }
  };

  return executeWithRetry(
    runAttempt,
    () => breaker.getState() === "OPEN",
    maxRetries,
    initialRetryDelayMs,
    random,
  );
}
