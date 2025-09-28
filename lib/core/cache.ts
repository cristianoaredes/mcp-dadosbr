import { CacheEntry, Cache } from "../types/index.js";

export class MemoryCache implements Cache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 256, ttl = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): any | null {
    this.cleanup();
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }
    this.accessOrder.set(key, ++this.accessCounter);
    return entry.data;
  }

  set(key: string, data: any): void {
    this.cleanup();
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    this.cache.set(key, { data, expires: Date.now() + this.ttl });
    this.accessOrder.set(key, ++this.accessCounter);
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
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  entries(): [string, any][] {
    this.cleanup();
    return Array.from(this.cache.entries()).map(([key, entry]) => [
      key,
      entry.data,
    ]);
  }
}


// KV Cache adapter for Cloudflare Workers
export class KVCache implements Cache {
  constructor(private kv: any, private ttl = 60000) {}

  async get(key: string): Promise<any> {
    const cached = await this.kv.get(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() < parsed.expires) {
        return parsed.data;
      }
    }
    return null;
  }

  async set(key: string, data: any): Promise<void> {
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
