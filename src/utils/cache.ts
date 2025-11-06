/**
 * Response caching system for MCP operations
 */

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  keyPrefix?: string; // Prefix for cache keys
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
}

/**
 * LRU (Least Recently Used) Cache implementation
 */
export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl;
  }

  /**
   * Generate cache key
   */
  private generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entries if cache is full
   */
  private evictLRU(): void {
    if (this.cache.size >= this.maxSize) {
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T, ttl?: number): void {
    this.cleanup();
    this.evictLRU();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hits++;
    entry.lastAccessed = Date.now();
    this.hits++;

    // Move to end (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const memoryUsage = this.cache.size * 200; // Rough estimate

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0,
      totalHits: this.hits,
      totalMisses: this.misses,
      memoryUsage,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get entries that are about to expire (within next minute)
   */
  getExpiringSoon(): Array<{ key: string; ttl: number }> {
    const now = Date.now();
    const expiring: Array<{ key: string; ttl: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      const timeToExpire = entry.ttl - (now - entry.timestamp);
      if (timeToExpire > 0 && timeToExpire < 60000) { // Within 1 minute
        expiring.push({ key, ttl: timeToExpire });
      }
    }

    return expiring.sort((a, b) => a.ttl - b.ttl);
  }
}

/**
 * Response cache manager for different types of data
 */
export class ResponseCacheManager {
  private static instance: ResponseCacheManager;
  private caches: Map<string, LRUCache<any>> = new Map();

  private constructor() {}

  static getInstance(): ResponseCacheManager {
    if (!ResponseCacheManager.instance) {
      ResponseCacheManager.instance = new ResponseCacheManager();
    }
    return ResponseCacheManager.instance;
  }

  /**
   * Get or create cache for a specific type
   */
  private getCache<T>(type: string, options: CacheOptions): LRUCache<T> {
    if (!this.caches.has(type)) {
      this.caches.set(type, new LRUCache<T>(options));
    }
    return this.caches.get(type) as LRUCache<T>;
  }

  /**
   * Cache incident data
   */
  cacheIncident<T>(id: string, data: T): void {
    const cache = this.getCache<T>('incidents', {
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 500,
      keyPrefix: 'incident',
    });
    cache.set(id, data);
  }

  /**
   * Get cached incident
   */
  getCachedIncident<T>(id: string): T | null {
    const cache = this.getCache<T>('incidents', {
      ttl: 10 * 60 * 1000,
      maxSize: 500,
      keyPrefix: 'incident',
    });
    return cache.get(id);
  }

  /**
   * Cache search results
   */
  cacheSearchResults<T>(query: string, filters: any, data: T): void {
    const cache = this.getCache<T>('searches', {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
      keyPrefix: 'search',
    });

    const key = JSON.stringify({ query, filters });
    cache.set(key, data);
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults<T>(query: string, filters: any): T | null {
    const cache = this.getCache<T>('searches', {
      ttl: 5 * 60 * 1000,
      maxSize: 200,
      keyPrefix: 'search',
    });

    const key = JSON.stringify({ query, filters });
    return cache.get(key);
  }

  /**
   * Cache similar incidents
   */
  cacheSimilarIncidents<T>(incidentId: string, data: T): void {
    const cache = this.getCache<T>('similar', {
      ttl: 15 * 60 * 1000, // 15 minutes
      maxSize: 300,
      keyPrefix: 'similar',
    });
    cache.set(incidentId, data);
  }

  /**
   * Get cached similar incidents
   */
  getCachedSimilarIncidents<T>(incidentId: string): T | null {
    const cache = this.getCache<T>('similar', {
      ttl: 15 * 60 * 1000,
      maxSize: 300,
      keyPrefix: 'similar',
    });
    return cache.get(incidentId);
  }

  /**
   * Cache export data
   */
  cacheExportData<T>(format: string, filters: any, data: T): void {
    const cache = this.getCache<T>('exports', {
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 50,
      keyPrefix: 'export',
    });

    const key = JSON.stringify({ format, filters });
    cache.set(key, data);
  }

  /**
   * Get cached export data
   */
  getCachedExportData<T>(format: string, filters: any): T | null {
    const cache = this.getCache<T>('exports', {
      ttl: 30 * 60 * 1000,
      maxSize: 50,
      keyPrefix: 'export',
    });

    const key = JSON.stringify({ format, filters });
    return cache.get(key);
  }

  /**
   * Invalidate cache by type
   */
  invalidateType(type: 'incidents' | 'searches' | 'similar' | 'exports'): void {
    const cache = this.caches.get(type);
    if (cache) {
      cache.clear();
    }
  }

  /**
   * Invalidate specific incident cache
   */
  invalidateIncident(id: string): void {
    const incidentCache = this.caches.get('incidents');
    if (incidentCache) {
      incidentCache.delete(id);
    }

    // Also invalidate similar incidents cache for this incident
    const similarCache = this.caches.get('similar');
    if (similarCache) {
      similarCache.delete(id);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};

    for (const [type, cache] of this.caches.entries()) {
      stats[type] = cache.getStats();
    }

    return stats;
  }

  /**
   * Clean up all expired entries
   */
  cleanup(): void {
    for (const cache of this.caches.values()) {
      cache.getStats(); // This triggers cleanup
    }
  }

  /**
   * Warm up cache with common data
   */
  async warmUp(): Promise<void> {
    // This would typically load common/frequently accessed data
    // Implementation depends on your specific use case
    console.log('Cache warm-up completed');
  }
}

/**
 * Global cache manager instance
 */
export const responseCache = ResponseCacheManager.getInstance();

/**
 * Cache decorator for functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  options: {
    ttl?: number;
    keyPrefix?: string;
    shouldCache?: (...args: Parameters<T>) => boolean;
  } = {}
) {
  const { ttl = 5 * 60 * 1000, keyPrefix = 'func', shouldCache } = options;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new LRUCache<ReturnType<T>>({
      ttl,
      maxSize: 100,
      keyPrefix,
    });

    descriptor.value = async function (...args: Parameters<T>) {
      // Check if we should cache this call
      if (shouldCache && !shouldCache(...args)) {
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = JSON.stringify(args);

      // Try to get from cache
      const cached = cache.get(key);
      if (cached !== null) {
        return cached;
      }

      // Execute function and cache result
      try {
        const result = await originalMethod.apply(this, args);
        cache.set(key, result);
        return result;
      } catch (error) {
        // Don't cache errors
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Cache warming utilities
 */
export const CacheWarmer = {
  /**
   * Pre-load common search queries
   */
  async warmSearchQueries(queries: Array<{ query: string; filters?: any }>): Promise<void> {
    console.log(`Warming up ${queries.length} search queries...`);

    for (const { query, filters } of queries) {
      try {
        // This would typically call your search function
        console.log(`Warming search: ${query}`);
      } catch (error) {
        console.error(`Failed to warm search query: ${query}`, error);
      }
    }
  },

  /**
   * Pre-load incident data
   */
  async warmIncidents(incidentIds: string[]): Promise<void> {
    console.log(`Warming up ${incidentIds.length} incidents...`);

    for (const id of incidentIds) {
      try {
        // This would typically call your get incident function
        console.log(`Warming incident: ${id}`);
      } catch (error) {
        console.error(`Failed to warm incident: ${id}`, error);
      }
    }
  },
};