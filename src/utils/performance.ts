/**
 * Performance monitoring utilities
 */

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastResetTime: Date;
}

export interface RequestMetrics {
  startTime: number;
  endTime?: number;
  operation: string;
  success?: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private activeRequests: Map<string, RequestMetrics> = new Map();
  private responseTimes: number[] = [];
  private readonly maxResponseTimeSamples = 1000;

  constructor() {
    // Initialize global metrics
    this.setMetric('global', {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastResetTime: new Date()
    });
  }

  /**
   * Start tracking a request
   */
  startRequest(requestId: string, operation: string): void {
    this.activeRequests.set(requestId, {
      startTime: Date.now(),
      operation
    });
  }

  /**
   * End tracking a request and record metrics
   */
  endRequest(requestId: string, success: boolean = true, error?: string): void {
    const request = this.activeRequests.get(requestId);
    if (!request) {
      return;
    }

    request.endTime = Date.now();
    request.success = success;
    request.error = error;

    const responseTime = request.endTime - request.startTime;
    this.recordResponseTime(responseTime);

    // Update operation-specific metrics
    const operationKey = `operation:${request.operation}`;
    const currentMetrics = this.getMetric(operationKey) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastResetTime: new Date()
    };

    currentMetrics.requestCount++;

    // Update average response time
    currentMetrics.averageResponseTime =
      (currentMetrics.averageResponseTime * (currentMetrics.requestCount - 1) + responseTime) /
      currentMetrics.requestCount;

    // Update error rate
    if (!success) {
      currentMetrics.errorRate =
        (currentMetrics.errorRate * (currentMetrics.requestCount - 1) + 1) /
        currentMetrics.requestCount;
    } else {
      currentMetrics.errorRate =
        (currentMetrics.errorRate * (currentMetrics.requestCount - 1)) /
        currentMetrics.requestCount;
    }

    this.setMetric(operationKey, currentMetrics);

    // Update global metrics
    const globalMetrics = this.getMetric('global')!;
    globalMetrics.requestCount++;
    globalMetrics.averageResponseTime =
      (globalMetrics.averageResponseTime * (globalMetrics.requestCount - 1) + responseTime) /
      globalMetrics.requestCount;

    if (!success) {
      globalMetrics.errorRate =
        (globalMetrics.errorRate * (globalMetrics.requestCount - 1) + 1) /
        globalMetrics.requestCount;
    } else {
      globalMetrics.errorRate =
        (globalMetrics.errorRate * (globalMetrics.requestCount - 1)) /
        globalMetrics.requestCount;
    }

    this.setMetric('global', globalMetrics);

    // Clean up active request
    this.activeRequests.delete(requestId);
  }

  /**
   * Record response time for percentile calculations
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);

    // Keep only the latest samples
    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeSamples);
    }
  }

  /**
   * Get performance percentile
   */
  getPercentile(percentile: number): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get metric by key
   */
  getMetric(key: string): PerformanceMetrics | undefined {
    return this.metrics.get(key);
  }

  /**
   * Set metric by key
   */
  private setMetric(key: string, metrics: PerformanceMetrics): void {
    this.metrics.set(key, metrics);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Reset metrics
   */
  resetMetrics(key?: string): void {
    if (key) {
      this.metrics.delete(key);
    } else {
      this.metrics.clear();
      this.responseTimes = [];
      this.setMetric('global', {
        requestCount: 0,
        averageResponseTime: 0,
        errorRate: 0,
        lastResetTime: new Date()
      });
    }
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    global: PerformanceMetrics;
    p50: number;
    p95: number;
    p99: number;
    activeRequests: number;
  } {
    const global = this.getMetric('global')!;

    return {
      global,
      p50: this.getPercentile(50),
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
      activeRequests: this.activeRequests.size
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance measurement decorator
 */
export function measurePerformance(operation: string) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const requestId = `${operation}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      performanceMonitor.startRequest(requestId, operation);

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endRequest(requestId, true);
        return result;
      } catch (error) {
        performanceMonitor.endRequest(requestId, false, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
} {
  const usage = process.memoryUsage();

  return {
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Performance threshold checker
 */
export class PerformanceThresholds {
  private thresholds: Map<string, number> = new Map();

  constructor() {
    // Set default thresholds (in milliseconds)
    this.thresholds.set('create_incident', 1000);
    this.thresholds.set('search_incidents', 500);
    this.thresholds.set('add_solution', 1000);
    this.thresholds.set('extract_lessons', 1000);
    this.thresholds.set('get_similar_incidents', 800);
    this.thresholds.set('update_incident_status', 500);
    this.thresholds.set('export_knowledge', 2000);
  }

  /**
   * Check if response time exceeds threshold
   */
  exceedsThreshold(operation: string, responseTime: number): boolean {
    const threshold = this.thresholds.get(operation);
    return threshold ? responseTime > threshold : false;
  }

  /**
   * Get threshold for operation
   */
  getThreshold(operation: string): number | undefined {
    return this.thresholds.get(operation);
  }

  /**
   * Set threshold for operation
   */
  setThreshold(operation: string, threshold: number): void {
    this.thresholds.set(operation, threshold);
  }
}

export const performanceThresholds = new PerformanceThresholds();