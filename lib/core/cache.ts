import { CacheEntry, Cache } from "../types/index.js";
import { CACHE } from "../shared/utils/constants.js";

export class MemoryCache implements Cache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private maxSize: number;
  private ttl: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    maxSize: number = CACHE.DEFAULT_SIZE,
    ttl: number = CACHE.DEFAULT_TTL_MS
  ) {
    this.maxSize = maxSize;
    this.ttl = ttl;

    // Optional: Start background cleanup
    if (process.env.MCP_CACHE_BACKGROUND_CLEANUP === "true") {
      this.startBackgroundCleanup();
    }
  }

  get<T = unknown>(key: string): T | null {
    // Lazy expiration - only check when accessed
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.data as T;
  }

  set<T = unknown>(key: string, data: T): void {
    // Evict if at capacity and key doesn't exist
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Set entry
    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl,
    });

    // Update access order
    this.accessOrder.set(key, ++this.accessCounter);
  }

  private startBackgroundCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE.CLEANUP_INTERVAL_MS);

    // Prevent interval from keeping process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      }
    }
  }

  private evictLRU(): void {
    let oldestKey = "";
    let oldestAccess = Infinity;
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  clear(): void {
    // Stop background cleanup if running
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  entries(): [string, unknown][] {
    this.cleanup();
    return Array.from(this.cache.entries()).map(([key, entry]) => [
      key,
      entry.data,
    ]);
  }
}

// KV Cache adapter for Cloudflare Workers
export class KVCache implements Cache {
  constructor(private kv: any, private ttl: number = CACHE.DEFAULT_TTL_MS) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const cached = await this.kv.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() < parsed.expires) {
        return parsed.data;
      }
    }
    return null;
  }

  async set<T = unknown>(key: string, data: T): Promise<void> {
    await this.kv.put(
      key,
      JSON.stringify({
        data,
        expires: Date.now() + this.ttl,
      })
    );
  }

  async clear(): Promise<void> {
    // KV doesn't have a clear all method
    // This would need to be implemented per use case
  }
}
