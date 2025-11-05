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

export async function httpJson(
  url: string,
  authHeaders?: Record<string, string>,
  timeoutMs = TIMEOUTS.HTTP_REQUEST_MS
): Promise<HttpResponse> {
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
    } catch (error: any) {
      if (error.name === "AbortError") {
        return {
          ok: false,
          error: "request timeout after 8 seconds",
          source: url,
        };
      }
      if (error.message?.includes("fetch")) {
        return { ok: false, error: "network error", source: url };
      }
      return { ok: false, error: "unknown error", source: url };
    }
  });
}
