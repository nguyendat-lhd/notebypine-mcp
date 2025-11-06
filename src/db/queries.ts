/**
 * Optimized database queries with caching and connection pooling
 */

import { makeAuthenticatedRequest } from './pocketbase.js';
import { config } from '../config.js';
import { logger, startTimer } from '../utils/logger.js';
import { performanceMonitor } from '../utils/performance.js';

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Clean up expired entries periodically
    this.cleanup();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): {
    size: number;
    hitRate: number;
    hits: number;
    misses: number;
  } {
    // This is a simplified version - in production you'd want to track hits/misses properly
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses over time
      hits: 0,
      misses: 0,
    };
  }
}

export const queryCache = new QueryCache();

/**
 * Database query builder with optimizations
 */
export class QueryBuilder {
  private baseUrl: string;
  private endpoint: string;
  private params: URLSearchParams = new URLSearchParams();
  private useCache: boolean = true;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(endpoint: string) {
    this.baseUrl = config.pocketbase.url;
    this.endpoint = endpoint;
  }

  /**
   * Add filter parameter
   */
  filter(filter: string): QueryBuilder {
    const existing = this.params.get('filter') || '';
    this.params.set('filter', existing ? `${existing} && ${filter}` : filter);
    return this;
  }

  /**
   * Add sort parameter
   */
  sort(field: string, direction: 'asc' | 'desc' = 'desc'): QueryBuilder {
    this.params.set('sort', direction === 'desc' ? `-${field}` : field);
    return this;
  }

  /**
   * Set pagination
   */
  paginate(page: number, perPage: number = 20): QueryBuilder {
    this.params.set('page', page.toString());
    this.params.set('perPage', perPage.toString());
    return this;
  }

  /**
   * Set limit (for performance, use instead of perPage for large datasets)
   */
  limit(count: number): QueryBuilder {
    this.params.set('perPage', Math.min(count, 100).toString()); // PocketBase max is 1000, but we limit to 100 for performance
    return this;
  }

  /**
   * Select specific fields
   */
  select(fields: string[]): QueryBuilder {
    this.params.set('fields', fields.join(','));
    return this;
  }

  /**
   * Disable caching for this query
   */
  noCache(): QueryBuilder {
    this.useCache = false;
    return this;
  }

  /**
   * Set cache TTL
   */
  cacheFor(ttl: number): QueryBuilder {
    this.cacheTTL = ttl;
    return this;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(): string {
    return `${this.endpoint}?${this.params.toString()}`;
  }

  /**
   * Execute the query
   */
  async execute<T = any>(): Promise<T> {
    const cacheKey = this.getCacheKey();
    const requestId = `query_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Try cache first
    if (this.useCache) {
      const cached = queryCache.get<T>(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { cacheKey, endpoint: this.endpoint });
        return cached;
      }
    }

    const endTimer = startTimer('database_query', requestId);

    try {
      const url = `${this.baseUrl}${this.endpoint}?${this.params.toString()}`;
      logger.debug('Executing query', { url, useCache: this.useCache });

      const response = await makeAuthenticatedRequest(url);

      if (!response.ok) {
        throw new Error(`Query failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result if enabled
      if (this.useCache && data) {
        queryCache.set(cacheKey, data, this.cacheTTL);
        logger.debug('Query result cached', { cacheKey, ttl: this.cacheTTL });
      }

      endTimer();
      return data;
    } catch (error) {
      endTimer();
      logger.error('Query execution failed', error instanceof Error ? error : String(error), {
        endpoint: this.endpoint,
        params: this.params.toString(),
      });
      throw error;
    }
  }
}

/**
 * Optimized incident queries
 */
export class IncidentQueries {
  /**
   * Search incidents with optimized filters
   */
  static searchIncidents(options: {
    query: string;
    category?: string;
    severity?: string;
    status?: string;
    limit?: number;
    page?: number;
    includeFields?: string[];
  }) {
    const { query, category, severity, status, limit = 20, page = 1, includeFields } = options;

    let builder = new QueryBuilder('/api/collections/incidents/records')
      .filter(`title ~ "${query}" || description ~ "${query}"`)
      .sort('created', 'desc')
      .paginate(page, Math.min(limit, 100));

    if (category) {
      builder.filter(`category = "${category}"`);
    }

    if (severity) {
      builder.filter(`severity = "${severity}"`);
    }

    if (status) {
      builder.filter(`status = "${status}"`);
    }

    if (includeFields) {
      builder.select(includeFields);
    }

    // Reduce cache TTL for search queries
    return builder.cacheFor(2 * 60 * 1000); // 2 minutes
  }

  /**
   * Get incident by ID with related data
   */
  static getIncidentById(id: string, includeRelations: boolean = false) {
    let builder = new QueryBuilder(`/api/collections/incidents/records/${id}`);

    if (includeRelations) {
      builder.select([
        'id',
        'title',
        'category',
        'description',
        'severity',
        'status',
        'symptoms',
        'context',
        'environment',
        'frequency',
        'visibility',
        'root_cause',
        'created',
        'updated'
      ]);
    }

    return builder.cacheFor(10 * 60 * 1000); // 10 minutes
  }

  /**
   * Get similar incidents based on content similarity
   */
  static getSimilarIncidents(incidentId: string, category: string, searchTerms: string[], limit: number = 5) {
    const searchFilter = searchTerms
      .map(term => `title ~ "${term}" || description ~ "${term}"`)
      .join(' || ');

    return new QueryBuilder('/api/collections/incidents/records')
      .filter(`(${searchFilter}) && category = "${category}" && id != "${incidentId}"`)
      .sort('created', 'desc')
      .limit(limit)
      .cacheFor(15 * 60 * 1000); // 15 minutes
  }

  /**
   * Get incidents by status with performance optimization
   */
  static getIncidentsByStatus(status: string, limit: number = 50) {
    return new QueryBuilder('/api/collections/incidents/records')
      .filter(`status = "${status}"`)
      .sort('created', 'desc')
      .limit(limit)
      .select(['id', 'title', 'category', 'severity', 'status', 'created'])
      .cacheFor(5 * 60 * 1000); // 5 minutes
  }

  /**
   * Get incidents with pagination for large datasets
   */
  static getIncidentsPaginated(page: number = 1, perPage: number = 20, filters: {
    category?: string;
    severity?: string;
    status?: string;
  } = {}) {
    let builder = new QueryBuilder('/api/collections/incidents/records')
      .sort('created', 'desc')
      .paginate(page, perPage);

    if (filters.category) {
      builder.filter(`category = "${filters.category}"`);
    }

    if (filters.severity) {
      builder.filter(`severity = "${filters.severity}"`);
    }

    if (filters.status) {
      builder.filter(`status = "${filters.status}"`);
    }

    return builder.cacheFor(3 * 60 * 1000); // 3 minutes
  }
}

/**
 * Optimized solution queries
 */
export class SolutionQueries {
  /**
   * Get solutions by incident ID
   */
  static getSolutionsByIncident(incidentId: string) {
    return new QueryBuilder('/api/collections/solutions/records')
      .filter(`incident_id = "${incidentId}"`)
      .sort('created', 'desc')
      .limit(10) // Reasonable limit per incident
      .cacheFor(10 * 60 * 1000); // 10 minutes
  }

  /**
   * Search solutions by text
   */
  static searchSolutions(query: string, limit: number = 20) {
    return new QueryBuilder('/api/collections/solutions/records')
      .filter(`solution_title ~ "${query}" || solution_description ~ "${query}"`)
      .sort('created', 'desc')
      .limit(limit)
      .cacheFor(5 * 60 * 1000); // 5 minutes
  }
}

/**
 * Optimized lessons learned queries
 */
export class LessonQueries {
  /**
   * Get lessons by incident ID
   */
  static getLessonsByIncident(incidentId: string) {
    return new QueryBuilder('/api/collections/lessons_learned/records')
      .filter(`incident_id = "${incidentId}"`)
      .sort('created', 'desc')
      .limit(5) // Reasonable limit per incident
      .cacheFor(15 * 60 * 1000); // 15 minutes
  }

  /**
   * Get lessons by type
   */
  static getLessonsByType(lessonType: string, limit: number = 50) {
    return new QueryBuilder('/api/collections/lessons_learned/records')
      .filter(`lesson_type = "${lessonType}"`)
      .sort('created', 'desc')
      .limit(limit)
      .cacheFor(20 * 60 * 1000); // 20 minutes
  }
}

/**
 * Cache management utilities
 */
export const CacheManager = {
  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    queryCache.invalidate();
    logger.info('All caches invalidated');
  },

  /**
   * Invalidate caches for specific entity type
   */
  invalidateType(type: 'incidents' | 'solutions' | 'lessons'): void {
    queryCache.invalidate(type);
    logger.info(`Cache invalidated for type: ${type}`);
  },

  /**
   * Get cache statistics
   */
  getStats(): {
    queryCache: ReturnType<typeof queryCache.getStats>;
  } {
    return {
      queryCache: queryCache.getStats(),
    };
  },

  /**
   * Warm up cache with common queries
   */
  async warmUp(): Promise<void> {
    logger.info('Starting cache warm-up');

    try {
      // Warm up common incident queries
      await IncidentQueries.getIncidentsByStatus('open', 10).execute();
      await IncidentQueries.getIncidentsByStatus('investigating', 10).execute();

      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up failed', error instanceof Error ? error : String(error));
    }
  }
};

/**
 * Database connection health check
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const response = await makeAuthenticatedRequest(`${config.pocketbase.url}/api/health`);
    const responseTime = Date.now() - startTime;

    return {
      healthy: response.ok,
      responseTime,
      error: response.ok ? undefined : `Health check failed: ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      healthy: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}