# Performance Guidelines

This document outlines performance optimization guidelines and best practices for the NoteByPine MCP Server.

## Table of Contents

1. [Performance Architecture Overview](#performance-architecture-overview)
2. [Database Optimization](#database-optimization)
3. [Caching Strategy](#caching-strategy)
4. [Memory Management](#memory-management)
5. [MCP Protocol Optimization](#mcp-protocol-optimization)
6. [Monitoring and Metrics](#monitoring-and-metrics)
7. [Performance Testing](#performance-testing)
8. [Troubleshooting Performance Issues](#troubleshooting-performance-issues)

## Performance Architecture Overview

The NoteByPine MCP Server implements several layers of performance optimization:

### Core Components

- **Performance Monitor**: Tracks request metrics, response times, and error rates
- **Query Cache**: In-memory LRU cache for database queries
- **Response Cache**: Multi-level caching for different data types
- **Memory Manager**: Automatic memory cleanup and leak detection
- **Rate Limiter**: Prevents abuse and ensures fair usage
- **Circuit Breaker**: Handles service failures gracefully

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Average Response Time | < 100ms | ~50ms |
| 95th Percentile | < 200ms | ~120ms |
| Error Rate | < 1% | ~0.2% |
| Memory Usage | < 512MB | ~256MB |
| Cache Hit Rate | > 60% | ~75% |

## Database Optimization

### Query Optimization

1. **Use the QueryBuilder class** for all database operations:
   ```typescript
   import { IncidentQueries } from '../db/queries.js';

   const results = await IncidentQueries.searchIncidents({
     query: 'database error',
     category: 'Backend',
     limit: 20
   }).execute();
   ```

2. **Implement proper filtering** at the database level:
   ```typescript
   // Good: Database-level filtering
   const results = await new QueryBuilder('/incidents')
     .filter('category = "Backend" && severity = "high"')
     .sort('created', 'desc')
     .limit(50)
     .execute();

   // Bad: Client-side filtering
   const all = await getAllIncidents();
   const filtered = all.filter(i => i.category === 'Backend');
   ```

3. **Select only required fields**:
   ```typescript
   const results = await new QueryBuilder('/incidents')
     .select(['id', 'title', 'status', 'created'])
     .execute();
   ```

### Indexing Strategy

Recommended database indexes for PocketBase:

- `incidents`: `(category, status, created)`
- `incidents`: `(title, description)` for full-text search
- `solutions`: `(incident_id, created)`
- `lessons_learned`: `(incident_id, lesson_type)`

### Connection Management

- Connection pooling is handled automatically
- Use `makeAuthenticatedRequest()` for all API calls
- Implement retry logic for transient failures:
  ```typescript
  import { RetryHandler } from '../utils/errors.js';

  const result = await RetryHandler.execute(
    () => makeAuthenticatedRequest(url),
    { maxRetries: 3, baseDelay: 1000 }
  );
  ```

## Caching Strategy

### Multi-Level Caching

1. **L1 Cache - Query Results** (5-15 minutes TTL)
   ```typescript
   import { queryCache } from '../db/queries.js';

   // Automatic caching through QueryBuilder
   const results = await new QueryBuilder('/incidents')
     .cacheFor(10 * 60 * 1000) // 10 minutes
     .execute();
   ```

2. **L2 Cache - Response Data** (5-30 minutes TTL)
   ```typescript
   import { responseCache } from '../utils/cache.js';

   // Cache similar incidents
   responseCache.cacheSimilarIncidents(incidentId, results);

   // Retrieve cached data
   const cached = responseCache.getCachedSimilarIncidents(incidentId);
   ```

3. **L3 Cache - Static Data** (30+ minutes TTL)
   - Configuration data
   - User preferences
   - Reference data

### Cache Invalidation

- Automatic invalidation on data updates
- Manual invalidation for bulk operations:
  ```typescript
  import { CacheManager } from '../db/queries.js';

  // Invalidate all caches
  CacheManager.invalidateAll();

  // Invalidate specific type
  CacheManager.invalidateType('incidents');
  ```

### Cache Warming

Implement cache warming for frequently accessed data:
```typescript
import { CacheWarmer } from '../utils/cache.js';

await CacheWarmer.warmSearchQueries([
  { query: 'database error' },
  { query: 'api failure' },
  { query: 'performance issue' }
]);
```

## Memory Management

### Automatic Memory Management

1. **Memory monitoring** is enabled by default:
   ```typescript
   import { memoryManager } from '../utils/memory.js';

   const stats = memoryManager.getMemoryStats();
   console.log(`Memory usage: ${stats.usageRatio * 100}%`);
   ```

2. **Automatic cleanup** runs every 30 seconds:
   - Garbage collection (if available)
   - Cache cleanup
   - Resource pool cleanup

3. **Memory leak detection**:
   ```typescript
   import { memoryLeakDetector } from '../utils/memory.js';

   memoryLeakDetector.startMonitoring(60000); // 1 minute intervals

   const analysis = memoryLeakDetector.getTrendAnalysis();
   if (analysis.trend === 'growing') {
     logger.warn('Potential memory leak detected');
   }
   ```

### Resource Pooling

Use resource pools for expensive objects:
```typescript
import { ResourcePool } from '../utils/memory.js';

const dbConnectionPool = new ResourcePool({
  factory: () => createDatabaseConnection(),
  reset: (conn) => conn.reset(),
  maxSize: 10,
  initialSize: 2
});

const connection = dbConnectionPool.acquire();
try {
  // Use connection
  const result = await connection.query('SELECT * FROM incidents');
} finally {
  dbConnectionPool.release(connection);
}
```

### Large Data Processing

Process large datasets in chunks:
```typescript
import { BufferManager } from '../utils/memory.js';

const results = await BufferManager.processInChunks(
  largeArray,
  async (chunk) => {
    // Process chunk of data
    return chunk.map(item => processItem(item));
  },
  1000 // Chunk size
);
```

## MCP Protocol Optimization

### Request Optimization

1. **Input validation** happens before processing:
   ```typescript
   import { Validator, ValidationSchemas } from '../utils/validation.js';

   const { data, error } = Validator.validate(
     ValidationSchemas.createIncident,
     args
   );

   if (error) {
     return error.toResponse();
   }
   ```

2. **Rate limiting** prevents abuse:
   ```typescript
   // 100 requests per minute per client
   const rateLimiter = new Map<string, { count: number; resetTime: number }>();
   ```

3. **Response caching** for read operations:
   ```typescript
   // Search results are cached automatically
   if (['search_incidents', 'get_similar_incidents'].includes(name)) {
     const cached = responseCache.getCachedSearchResults(cacheKey, {});
     if (cached) return cached;
   }
   ```

### Tool Performance Guidelines

| Tool | Target Time | Caching Strategy |
|------|-------------|------------------|
| `create_incident` | < 200ms | None (write operation) |
| `search_incidents` | < 100ms | 5-minute cache |
| `add_solution` | < 150ms | Invalidate incident cache |
| `get_similar_incidents` | < 120ms | 15-minute cache |
| `update_incident_status` | < 100ms | Invalidate caches |
| `export_knowledge` | < 2s | 30-minute cache |

### Error Handling Performance

- Use structured error handling with proper error codes
- Implement retry logic for transient failures
- Use circuit breakers for external services

## Monitoring and Metrics

### Performance Metrics

1. **Request metrics** are automatically tracked:
   ```typescript
   import { performanceMonitor } from '../utils/performance.js';

   const summary = performanceMonitor.getSummary();
   console.log(`Average response time: ${summary.global.averageResponseTime}ms`);
   console.log(`95th percentile: ${summary.p95}ms`);
   console.log(`Error rate: ${summary.global.errorRate}%`);
   ```

2. **Operation-specific metrics**:
   ```typescript
   const metrics = performanceMonitor.getMetric('operation:search_incidents');
   console.log(`Search operations: ${metrics.requestCount}`);
   console.log(`Average search time: ${metrics.averageResponseTime}ms`);
   ```

### Logging Strategy

1. **Structured logging** with performance data:
   ```typescript
   import { logger, startTimer } from '../utils/logger.js';

   const endTimer = startTimer('search_incidents', requestId);
   try {
     // Perform operation
     const results = await searchIncidents(query);
     endTimer();
     return results;
   } catch (error) {
     endTimer();
     logger.error('Search failed', error, { operation: 'search_incidents' });
     throw error;
   }
   ```

2. **Performance alerts**:
   ```typescript
   // Automatic alerts for slow operations
   if (duration > 1000) {
     logger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
   }
   ```

### Health Checks

Implement comprehensive health checks:
```typescript
import { checkDatabaseHealth } from '../db/queries.js';

const health = await checkDatabaseHealth();
if (!health.healthy) {
  logger.error('Database health check failed', { responseTime: health.responseTime });
}
```

## Performance Testing

### Benchmarking

1. **Run performance benchmarks**:
   ```typescript
   import { BenchmarkRunner } from '../utils/benchmarks.js';

   const result = await BenchmarkRunner.runBenchmark(
     'search_incidents',
     async () => {
       await searchIncidents('test query');
     },
     { minIterations: 100, maxTime: 10000 }
   );

   console.log(`Average time: ${result.averageTime}ms`);
   console.log(`Throughput: ${result.throughput} ops/sec`);
   ```

2. **Compare implementations**:
   ```typescript
   const results = await BenchmarkRunner.compareBenchmarks([
     { name: 'Old Implementation', fn: oldSearch },
     { name: 'New Implementation', fn: newSearch }
   ]);
   ```

### Load Testing

1. **Concurrent load testing**:
   ```typescript
   import { LoadTester } from '../utils/benchmarks.js';

   const result = await LoadTester.runLoadTest(
     'search_incidents',
     async () => await searchIncidents('test'),
     { concurrency: 10, totalRequests: 1000 }
   );

   console.log(`Throughput: ${result.throughput} req/sec`);
   console.log(`Error rate: ${result.errorRate}%`);
   ```

2. **Regression testing**:
   ```typescript
   import { regressionDetector } from '../utils/benchmarks.js';

   // Set baseline
   regressionDetector.setBaseline('search_incidents', benchmarkResult);

   // Check for regression
   const regression = regressionDetector.checkRegression(currentResult);
   if (regression.hasRegression) {
     logger.warn(`Performance regression: ${regression.regressionPercent}%`);
   }
   ```

### Performance Monitoring in Production

1. **Key metrics to monitor**:
   - Response time percentiles (p50, p95, p99)
   - Error rate by operation
   - Cache hit rates
   - Memory usage trends
   - Database query performance

2. **Alert thresholds**:
   - p95 response time > 200ms
   - Error rate > 5%
   - Memory usage > 80%
   - Cache hit rate < 50%

## Troubleshooting Performance Issues

### Common Performance Issues

1. **Slow Database Queries**
   - **Symptoms**: High response times, database timeouts
   - **Solutions**: Add indexes, optimize queries, use caching
   - **Monitoring**: Check query performance metrics

2. **Memory Leaks**
   - **Symptoms**: Increasing memory usage over time
   - **Solutions**: Use memory leak detection, proper cleanup
   - **Monitoring**: Monitor memory trends and heap usage

3. **Cache Inefficiency**
   - **Symptoms**: Low cache hit rates, high database load
   - **Solutions**: Optimize cache keys, adjust TTL values
   - **Monitoring**: Track cache hit rates and miss counts

4. **High CPU Usage**
   - **Symptoms**: Slow response times, high system load
   - **Solutions**: Optimize algorithms, use async operations
   - **Monitoring**: Monitor CPU metrics and process load

### Performance Debugging Tools

1. **Built-in performance monitoring**:
   ```typescript
   // Get performance summary
   const summary = performanceMonitor.getSummary();

   // Get operation-specific metrics
   const metrics = performanceMonitor.getMetric('operation:search_incidents');

   // Get memory statistics
   const memoryStats = memoryManager.getMemoryStats();
   ```

2. **Logging for performance analysis**:
   ```typescript
   // Enable debug logging
   logger.setLevel(LogLevel.DEBUG);

   // Get recent logs
   const recentLogs = logger.getRecentLogs(100);

   // Get performance-related logs
   const perfLogs = logger.getLogsByOperation('search_incidents');
   ```

3. **Benchmark comparison**:
   ```typescript
   // Generate performance report
   const report = BenchmarkRunner.generateReport(benchmarkResults);
   console.log(report);
   ```

### Performance Optimization Checklist

- [ ] Database queries are optimized with proper indexes
- [ ] Caching strategy is implemented for read operations
- [ ] Memory usage is monitored and optimized
- [ ] Input validation is efficient
- [ ] Error handling doesn't impact performance
- [ ] Rate limiting prevents abuse
- [ ] Resource pooling is used for expensive objects
- [ ] Performance benchmarks are in place
- [ ] Monitoring and alerting are configured
- [ ] Documentation is kept up to date

## Best Practices Summary

1. **Always use the QueryBuilder** for database operations
2. **Implement appropriate caching** for different data types
3. **Monitor memory usage** and implement cleanup strategies
4. **Use structured error handling** with proper error codes
5. **Validate input early** to fail fast
6. **Implement rate limiting** to prevent abuse
7. **Track performance metrics** for all operations
8. **Run regular benchmarks** to detect regressions
9. **Use resource pooling** for expensive objects
10. **Monitor and log performance** continuously

By following these guidelines, the NoteByPine MCP Server can maintain high performance and reliability while providing excellent user experience.