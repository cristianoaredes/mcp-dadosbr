import { SERVER_NAME, SERVER_VERSION } from "../config/index.js";
import { HttpResponse } from "../types/index.js";

// Circuit breaker state
let failures = 0;
let lastFailure = 0;
let cbState: "CLOSED" | "OPEN" = "CLOSED";

async function withCircuitBreaker<T>(fn: () => Promise<T>): Promise<T> {
  if (cbState === "OPEN" && Date.now() - lastFailure < 30000) {
    throw new Error("Circuit breaker is OPEN");
  }
  if (cbState === "OPEN") cbState = "CLOSED";
  try {
    const result = await fn();
    failures = 0;
    cbState = "CLOSED";
    return result;
  } catch (error) {
    failures++;
    lastFailure = Date.now();
    if (failures >= 5) cbState = "OPEN";
    throw error;
  }
}

export async function httpJson(
  url: string,
  authHeaders?: Record<string, string>,
  timeoutMs = 8000
): Promise<HttpResponse> {
  return await withCircuitBreaker(async () => {
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
