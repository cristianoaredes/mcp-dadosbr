/**
 * Shared cached & deduplicated lookup service for core entities (CNPJ, CEP).
 * Extracted into lib/core/ so core modules (intelligence) do not depend on lib/tools/.
 */

import { httpJson } from "./http-client.js";
import { TIMEOUTS } from "../config/timeouts.js";
import { ApiConfig, Cache, LookupResult } from "../types/index.js";

interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const pendingRequests = new Map<string, PendingRequest>();

export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

export async function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const timeoutMs = TIMEOUTS.DEDUP_TIMEOUT_MS;
  const existing = pendingRequests.get(key);
  if (existing) {
    if (Date.now() - existing.timestamp < timeoutMs) {
      return existing.promise as Promise<T>;
    }
    clearTimeout(existing.timeoutId);
  }

  const promise = fn();
  const timeoutId = setTimeout(() => {
    if (pendingRequests.get(key)?.promise === promise) {
      pendingRequests.delete(key);
    }
  }, timeoutMs);
  (timeoutId as { unref?: () => void }).unref?.();

  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
    timeoutId,
  });

  try {
    return await promise;
  } finally {
    clearTimeout(timeoutId);
    if (pendingRequests.get(key)?.promise === promise) {
      pendingRequests.delete(key);
    }
  }
}

export async function lookup(
  type: "cnpj" | "cep",
  input: string,
  apiConfig: ApiConfig,
  cache?: Cache
): Promise<LookupResult> {
  const baseUrl = type === "cnpj" ? apiConfig.cnpjBaseUrl : apiConfig.cepBaseUrl;
  const cacheKey = `${type}:${baseUrl}:${input}`;
  if (cache) {
    const cached = await cache.get(cacheKey);
    if (cached) return { ok: true, data: cached };
  }
  return await deduplicate(cacheKey, async () => {
    const result = await httpJson(`${baseUrl}${input}`, apiConfig.authHeaders);
    if (result.ok && result.data) {
      const responseData = {
        ...result.data,
        source: result.source,
        fetchedAt: new Date().toISOString(),
      };
      if (cache) await cache.set(cacheKey, responseData);
      return { ok: true, data: responseData };
    }
    return {
      ok: false,
      error:
        result.error === "not found"
          ? `${type.toUpperCase()} not found`
          : result.error || "unknown error",
    };
  });
}
