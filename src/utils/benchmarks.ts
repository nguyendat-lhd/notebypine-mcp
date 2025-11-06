/**
 * Performance benchmarking utilities
 */

import { performanceMonitor, getMemoryUsage, formatBytes } from './performance.js';
import { logger } from './logger.js';

/**
 * Benchmark configuration
 */
interface BenchmarkConfig {
  warmupIterations: number;
  minIterations: number;
  maxIterations: number;
  maxTime: number; // milliseconds
  confidenceLevel: number; // 0-1
}

/**
 * Benchmark result
 */
interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  memoryBefore: ReturnType<typeof getMemoryUsage>;
  memoryAfter: ReturnType<typeof getMemoryUsage>;
  memoryDelta: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  throughput: number; // operations per second
  config: BenchmarkConfig;
}

/**
 * Performance benchmark runner
 */
export class BenchmarkRunner {
  private static readonly DEFAULT_CONFIG: BenchmarkConfig = {
    warmupIterations: 10,
    minIterations: 50,
    maxIterations: 1000,
    maxTime: 5000, // 5 seconds
    confidenceLevel: 0.95,
  };

  /**
   * Run a performance benchmark
   */
  static async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    config: Partial<BenchmarkConfig> = {}
  ): Promise<BenchmarkResult> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };

    logger.info('Starting benchmark', { name, config: finalConfig });

    // Memory before
    const memoryBefore = getMemoryUsage();

    // Warmup
    logger.debug('Running warmup iterations', { count: finalConfig.warmupIterations });
    for (let i = 0; i < finalConfig.warmupIterations; i++) {
      await fn();
    }

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    // Main benchmark
    const times: number[] = [];
    const startTime = Date.now();

    while (times.length < finalConfig.minIterations ||
           (Date.now() - startTime) < finalConfig.maxTime) {
      if (times.length >= finalConfig.maxIterations) {
        break;
      }

      const iterationStart = process.hrtime.bigint();
      await fn();
      const iterationEnd = process.hrtime.bigint();

      const iterationTime = Number(iterationEnd - iterationStart) / 1000000; // Convert to milliseconds
      times.push(iterationTime);
    }

    // Memory after
    const memoryAfter = getMemoryUsage();

    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    // Calculate percentiles
    const sortedTimes = [...times].sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedTimes, 50);
    const p95 = this.getPercentile(sortedTimes, 95);
    const p99 = this.getPercentile(sortedTimes, 99);

    const throughput = 1000 / averageTime; // operations per second

    const result: BenchmarkResult = {
      name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      p50,
      p95,
      p99,
      memoryBefore,
      memoryAfter,
      memoryDelta: {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      },
      throughput,
      config: finalConfig,
    };

    logger.info('Benchmark completed', {
      name,
      iterations: result.iterations,
      averageTime: `${result.averageTime.toFixed(3)}ms`,
      throughput: `${result.throughput.toFixed(2)} ops/sec`,
      p95: `${result.p95.toFixed(3)}ms`,
      memoryDelta: formatBytes(result.memoryDelta.heapUsed),
    });

    return result;
  }

  /**
   * Calculate percentile from sorted array
   */
  private static getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  /**
   * Run multiple benchmarks and compare results
   */
  static async compareBenchmarks(
    benchmarks: Array<{
      name: string;
      fn: () => Promise<void> | void;
      config?: Partial<BenchmarkConfig>;
    }>
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const benchmark of benchmarks) {
      const result = await this.runBenchmark(benchmark.name, benchmark.fn, benchmark.config);
      results.push(result);
    }

    // Log comparison
    logger.info('Benchmark comparison completed', {
      benchmarks: results.map(r => ({
        name: r.name,
        avgTime: `${r.averageTime.toFixed(3)}ms`,
        throughput: `${r.throughput.toFixed(2)} ops/sec`,
        p95: `${r.p95.toFixed(3)}ms`,
      })),
    });

    return results;
  }

  /**
   * Generate benchmark report
   */
  static generateReport(results: BenchmarkResult[]): string {
    let report = '# Performance Benchmark Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const result of results) {
      report += `## ${result.name}\n\n`;
      report += `- **Iterations:** ${result.iterations}\n`;
      report += `- **Average Time:** ${result.averageTime.toFixed(3)}ms\n`;
      report += `- **Min/Max Time:** ${result.minTime.toFixed(3)}ms / ${result.maxTime.toFixed(3)}ms\n`;
      report += `- **50th Percentile:** ${result.p50.toFixed(3)}ms\n`;
      report += `- **95th Percentile:** ${result.p95.toFixed(3)}ms\n`;
      report += `- **99th Percentile:** ${result.p99.toFixed(3)}ms\n`;
      report += `- **Throughput:** ${result.throughput.toFixed(2)} ops/sec\n`;
      report += `- **Memory Delta:** ${formatBytes(result.memoryDelta.heapUsed)}\n`;
      report += `- **Total Time:** ${result.totalTime.toFixed(3)}ms\n\n`;
    }

    // Comparison section
    if (results.length > 1) {
      report += '## Comparison\n\n';

      const sortedByThroughput = [...results].sort((a, b) => b.throughput - a.throughput);
      const sortedByAvgTime = [...results].sort((a, b) => a.averageTime - b.averageTime);

      report += `### Fastest (Average Time): ${sortedByAvgTime[0].name} (${sortedByAvgTime[0].averageTime.toFixed(3)}ms)\n`;
      report += `### Highest Throughput: ${sortedByThroughput[0].name} (${sortedByThroughput[0].throughput.toFixed(2)} ops/sec)\n\n`;
    }

    return report;
  }
}

/**
 * Load testing utilities
 */
export class LoadTester {
  /**
   * Run concurrent load test
   */
  static async runLoadTest(
    name: string,
    fn: () => Promise<void> | void,
    options: {
      concurrency: number;
      totalRequests: number;
      rampUpTime?: number; // milliseconds
    }
  ): Promise<{
    name: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTime: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95: number;
    p99: number;
    throughput: number;
    errorRate: number;
  }> {
    const { concurrency, totalRequests, rampUpTime = 0 } = options;

    logger.info('Starting load test', { name, concurrency, totalRequests });

    const responseTimes: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;
    const startTime = Date.now();

    // Calculate ramp-up delay between workers
    const rampUpDelay = rampUpTime > 0 ? rampUpTime / concurrency : 0;

    // Create workers
    const workers: Promise<void>[] = [];
    const requestsPerWorker = Math.ceil(totalRequests / concurrency);

    for (let i = 0; i < concurrency; i++) {
      const worker = this.createWorker(i, fn, requestsPerWorker, rampUpDelay * i, responseTimes);
      workers.push(worker);
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    const totalTime = Date.now() - startTime;

    // Calculate statistics
    responseTimes.sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    const p95 = this.getPercentile(responseTimes, 95);
    const p99 = this.getPercentile(responseTimes, 99);

    const throughput = (successfulRequests / totalTime) * 1000; // requests per second
    const errorRate = (failedRequests / totalRequests) * 100;

    const result = {
      name,
      totalRequests,
      successfulRequests,
      failedRequests,
      totalTime,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95,
      p99,
      throughput,
      errorRate,
    };

    logger.info('Load test completed', {
      name,
      successfulRequests: result.successfulRequests,
      failedRequests: result.failedRequests,
      throughput: `${result.throughput.toFixed(2)} req/sec`,
      avgResponseTime: `${result.averageResponseTime.toFixed(3)}ms`,
      p95: `${result.p95.toFixed(3)}ms`,
      errorRate: `${result.errorRate.toFixed(2)}%`,
    });

    return result;
  }

  /**
   * Create a worker for load testing
   */
  private static async createWorker(
    workerId: number,
    fn: () => Promise<void> | void,
    requestCount: number,
    startDelay: number,
    responseTimes: number[]
  ): Promise<void> {
    // Wait for ramp-up delay
    if (startDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, startDelay));
    }

    for (let i = 0; i < requestCount; i++) {
      const startTime = process.hrtime.bigint();

      try {
        await fn();
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        responseTimes.push(responseTime);
      } catch (error) {
        // Log error but continue
        logger.warn('Load test request failed', {
          workerId,
          requestIndex: i,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get percentile from array
   */
  private static getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}

/**
 * Performance regression detector
 */
export class RegressionDetector {
  private baselineResults: Map<string, BenchmarkResult> = new Map();

  /**
   * Set baseline result
   */
  setBaseline(name: string, result: BenchmarkResult): void {
    this.baselineResults.set(name, result);
    logger.info('Performance baseline set', { name, avgTime: result.averageTime });
  }

  /**
   * Check for regression
   */
  checkRegression(currentResult: BenchmarkResult): {
    hasRegression: boolean;
    regressionPercent: number;
    baseline: BenchmarkResult | undefined;
    threshold: number;
  } {
    const baseline = this.baselineResults.get(currentResult.name);

    if (!baseline) {
      return {
        hasRegression: false,
        regressionPercent: 0,
        baseline: undefined,
        threshold: 20, // 20% threshold
      };
    }

    const regressionPercent = ((currentResult.averageTime - baseline.averageTime) / baseline.averageTime) * 100;
    const threshold = 20; // 20% regression threshold
    const hasRegression = regressionPercent > threshold;

    if (hasRegression) {
      logger.warn('Performance regression detected', {
        name: currentResult.name,
        regressionPercent: `${regressionPercent.toFixed(2)}%`,
        baseline: `${baseline.averageTime.toFixed(3)}ms`,
        current: `${currentResult.averageTime.toFixed(3)}ms`,
      });
    }

    return {
      hasRegression,
      regressionPercent,
      baseline,
      threshold,
    };
  }

  /**
   * Get all baselines
   */
  getBaselines(): Map<string, BenchmarkResult> {
    return new Map(this.baselineResults);
  }

  /**
   * Clear baselines
   */
  clearBaselines(): void {
    this.baselineResults.clear();
    logger.info('Performance baselines cleared');
  }
}

/**
 * Global regression detector instance
 */
export const regressionDetector = new RegressionDetector();

/**
 * Predefined benchmark suites
 */
export const BenchmarkSuites = {
  /**
   * MCP operation benchmarks
   */
  async mcpOperations(): Promise<BenchmarkResult[]> {
    return BenchmarkRunner.compareBenchmarks([
      {
        name: 'Create Incident',
        fn: async () => {
          // Simulate create incident operation
          await new Promise(resolve => setTimeout(resolve, 10));
        },
      },
      {
        name: 'Search Incidents',
        fn: async () => {
          // Simulate search operation
          await new Promise(resolve => setTimeout(resolve, 5));
        },
      },
      {
        name: 'Add Solution',
        fn: async () => {
          // Simulate add solution operation
          await new Promise(resolve => setTimeout(resolve, 8));
        },
      },
      {
        name: 'Get Similar Incidents',
        fn: async () => {
          // Simulate similar incidents operation
          await new Promise(resolve => setTimeout(resolve, 15));
        },
      },
    ]);
  },

  /**
   * Cache performance benchmarks
   */
  async cacheOperations(): Promise<BenchmarkResult[]> {
    // Mock cache for testing
    const cache = new Map<string, any>();

    return BenchmarkRunner.compareBenchmarks([
      {
        name: 'Cache Set',
        fn: () => {
          cache.set(`key_${Math.random()}`, { data: 'test', timestamp: Date.now() });
        },
      },
      {
        name: 'Cache Get (Hit)',
        fn: () => {
          cache.get('existing_key');
        },
      },
      {
        name: 'Cache Get (Miss)',
        fn: () => {
          cache.get('non_existing_key');
        },
      },
    ]);
  },

  /**
   * Memory operation benchmarks
   */
  async memoryOperations(): Promise<BenchmarkResult[]> {
    return BenchmarkRunner.compareBenchmarks([
      {
        name: 'Object Creation',
        fn: () => {
          const obj = {
            id: Math.random(),
            title: 'Test Title',
            description: 'Test Description',
            timestamp: Date.now(),
            metadata: { key: 'value' },
          };
          // Prevent optimization
          if (obj.id === 0) console.log(obj);
        },
      },
      {
        name: 'Array Operations',
        fn: () => {
          const arr = Array.from({ length: 100 }, (_, i) => ({ id: i, value: Math.random() }));
          arr.filter(item => item.value > 0.5).map(item => item.id);
        },
      },
      {
        name: 'String Operations',
        fn: () => {
          const str = 'This is a test string for benchmarking purposes';
          str.split(' ').filter(word => word.length > 3).join('-');
        },
      },
    ]);
  },
};