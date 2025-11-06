/**
 * Memory usage optimization and resource management utilities
 */

import { logger } from './logger.js';
import { formatBytes } from './performance.js';

/**
 * Memory monitoring configuration
 */
interface MemoryConfig {
  maxHeapSize: number;
  warningThreshold: number;
  cleanupInterval: number;
  enableAutoGC: boolean;
}

/**
 * Memory manager for optimizing resource usage
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private config: MemoryConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private lastCleanup = 0;
  private isCleaningUp = false;

  private constructor(config: Partial<MemoryConfig> = {}) {
    this.config = {
      maxHeapSize: 512 * 1024 * 1024, // 512MB
      warningThreshold: 0.8, // 80%
      cleanupInterval: 30000, // 30 seconds
      enableAutoGC: true,
      ...config,
    };

    this.startMonitoring();
  }

  static getInstance(config?: Partial<MemoryConfig>): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(config);
    }
    return MemoryManager.instance;
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.cleanupInterval);

    logger.info('Memory monitoring started', {
      maxHeapSize: formatBytes(this.config.maxHeapSize),
      warningThreshold: this.config.warningThreshold,
      cleanupInterval: this.config.cleanupInterval,
    });
  }

  /**
   * Check current memory usage
   */
  private checkMemoryUsage(): void {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;
    const usageRatio = heapUsed / this.config.maxHeapSize;

    logger.debug('Memory usage check', {
      heapUsed: formatBytes(heapUsed),
      heapTotal: formatBytes(heapTotal),
      external: formatBytes(usage.external),
      rss: formatBytes(usage.rss),
      usageRatio: `${(usageRatio * 100).toFixed(2)}%`,
    });

    // Warning threshold
    if (usageRatio > this.config.warningThreshold) {
      logger.warn('High memory usage detected', {
        usage: formatBytes(heapUsed),
        threshold: formatBytes(this.config.maxHeapSize * this.config.warningThreshold),
        ratio: `${(usageRatio * 100).toFixed(2)}%`,
      });

      this.performCleanup();
    }

    // Critical threshold
    if (heapUsed > this.config.maxHeapSize) {
      logger.error('Critical memory usage detected', {
        usage: formatBytes(heapUsed),
        limit: formatBytes(this.config.maxHeapSize),
      });

      this.performAggressiveCleanup();
    }
  }

  /**
   * Perform routine cleanup
   */
  private performCleanup(): void {
    if (this.isCleaningUp) {
      return;
    }

    this.isCleaningUp = true;
    const startTime = Date.now();

    logger.debug('Starting memory cleanup');

    try {
      // Force garbage collection if available
      if (this.config.enableAutoGC && global.gc) {
        global.gc();
        logger.debug('Forced garbage collection');
      }

      // Clear any caches or temporary data
      this.clearCaches();

      const duration = Date.now() - startTime;
      const afterUsage = process.memoryUsage();

      logger.info('Memory cleanup completed', {
        duration: `${duration}ms`,
        beforeHeap: formatBytes(process.memoryUsage().heapUsed),
        afterHeap: formatBytes(afterUsage.heapUsed),
        freed: formatBytes(process.memoryUsage().heapUsed - afterUsage.heapUsed),
      });

      this.lastCleanup = Date.now();
    } catch (error) {
      logger.error('Memory cleanup failed', error instanceof Error ? error : String(error));
    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Perform aggressive cleanup
   */
  private performAggressiveCleanup(): void {
    logger.warn('Performing aggressive memory cleanup');

    try {
      // Multiple GC cycles
      if (global.gc) {
        for (let i = 0; i < 3; i++) {
          global.gc();
          // Small delay between GC cycles
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
        }
      }

      // Clear all caches
      this.clearCaches();

      // Reset any large data structures
      this.resetDataStructures();

      logger.warn('Aggressive memory cleanup completed');
    } catch (error) {
      logger.error('Aggressive memory cleanup failed', error instanceof Error ? error : String(error));
    }
  }

  /**
   * Clear caches and temporary storage
   */
  private clearCaches(): void {
    // This would clear any application-specific caches
    // Implementation depends on your caching strategy
    logger.debug('Clearing application caches');
  }

  /**
   * Reset large data structures
   */
  private resetDataStructures(): void {
    // Reset any large data structures that might be holding memory
    logger.debug('Resetting data structures');
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usageRatio: number;
    lastCleanup: number;
  } {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed;
    const heapTotal = usage.heapTotal;

    return {
      heapUsed,
      heapTotal,
      external: usage.external,
      rss: usage.rss,
      usageRatio: heapUsed / this.config.maxHeapSize,
      lastCleanup: this.lastCleanup,
    };
  }

  /**
   * Force cleanup manually
   */
  forceCleanup(): void {
    logger.info('Manual cleanup triggered');
    this.performCleanup();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('Memory monitoring stopped');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Memory manager configuration updated', config);
    this.startMonitoring();
  }
}

/**
 * Resource pool for reusing expensive objects
 */
export class ResourcePool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private readonly factory: () => T;
  private readonly resetFn?: (item: T) => void;
  private readonly maxSize: number;

  constructor(options: {
    factory: () => T;
    reset?: (item: T) => void;
    maxSize?: number;
    initialSize?: number;
  }) {
    this.factory = options.factory;
    this.resetFn = options.reset;
    this.maxSize = options.maxSize || 10;

    // Pre-populate pool
    for (let i = 0; i < (options.initialSize || 0); i++) {
      this.available.push(this.factory());
    }
  }

  /**
   * Acquire resource from pool
   */
  acquire(): T {
    let resource: T;

    if (this.available.length > 0) {
      resource = this.available.pop()!;
    } else {
      resource = this.factory();
    }

    this.inUse.add(resource);
    return resource;
  }

  /**
   * Release resource back to pool
   */
  release(resource: T): void {
    if (!this.inUse.has(resource)) {
      return;
    }

    this.inUse.delete(resource);

    // Reset resource if needed
    if (this.resetFn) {
      try {
        this.resetFn(resource);
      } catch (error) {
        logger.warn('Failed to reset resource', error instanceof Error ? error : String(error));
        return;
      }
    }

    // Return to pool if not at max capacity
    if (this.available.length < this.maxSize) {
      this.available.push(resource);
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): { available: number; inUse: number; total: number } {
    return {
      available: this.available.length,
      inUse: this.inUse.size,
      total: this.available.length + this.inUse.size,
    };
  }

  /**
   * Clear pool
   */
  clear(): void {
    this.available = [];
    this.inUse.clear();
  }
}

/**
 * Buffer manager for handling large data efficiently
 */
export class BufferManager {
  private static readonly MAX_BUFFER_SIZE = 1024 * 1024; // 1MB
  private static readonly CHUNK_SIZE = 64 * 1024; // 64KB

  /**
   * Split large data into manageable chunks
   */
  static splitIntoChunks<T>(data: T[], maxChunkSize: number = this.CHUNK_SIZE): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += maxChunkSize) {
      chunks.push(data.slice(i, i + maxChunkSize));
    }
    return chunks;
  }

  /**
   * Process large data arrays in chunks to avoid memory spikes
   */
  static async processInChunks<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize: number = this.CHUNK_SIZE
  ): Promise<R[]> {
    const chunks = this.splitIntoChunks(data, chunkSize);
    const results: R[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.debug(`Processing chunk ${i + 1}/${chunks.length}`, { chunkSize: chunk.length });

      try {
        const chunkResults = await processor(chunk);
        results.push(...chunkResults);

        // Allow GC between chunks
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error) {
        logger.error(`Failed to process chunk ${i + 1}`, error instanceof Error ? error : String(error));
        throw error;
      }
    }

    return results;
  }

  /**
   * Create memory-efficient stream processor
   */
  static createStreamProcessor<T, R>(
    processor: (item: T) => Promise<R | null>
  ): {
    process: (items: T[]) => Promise<R[]>;
    flush: () => Promise<void>;
  } {
    let buffer: T[] = [];
    let processing = false;

    return {
      process: async (items: T[]): Promise<R[]> => {
        buffer.push(...items);

        if (processing) {
          return [];
        }

        processing = true;
        const results: R[] = [];

        try {
          while (buffer.length > 0) {
            const batch = buffer.splice(0, this.CHUNK_SIZE);
            const batchResults: R[] = [];

            for (const item of batch) {
              try {
                const result = await processor(item);
                if (result !== null) {
                  batchResults.push(result);
                }
              } catch (error) {
                logger.warn('Failed to process item', error instanceof Error ? error : String(error));
              }
            }

            results.push(...batchResults);

            // Allow GC between batches
            if (buffer.length > 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        } finally {
          processing = false;
        }

        return results;
      },

      flush: async (): Promise<void> => {
        while (processing || buffer.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      },
    };
  }
}

/**
 * Memory leak detector
 */
export class MemoryLeakDetector {
  private static instance: MemoryLeakDetector;
  private samples: Array<{ timestamp: number; usage: NodeJS.MemoryUsage }> = [];
  private isMonitoring = false;
  private monitorInterval?: NodeJS.Timeout;

  static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector();
    }
    return MemoryLeakDetector.instance;
  }

  /**
   * Start monitoring for memory leaks
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.samples = [];

    this.monitorInterval = setInterval(() => {
      this.takeSample();
    }, intervalMs);

    logger.info('Memory leak detection started', { interval: intervalMs });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.isMonitoring = false;
    logger.info('Memory leak detection stopped');
  }

  /**
   * Take memory sample
   */
  private takeSample(): void {
    const usage = process.memoryUsage();
    this.samples.push({
      timestamp: Date.now(),
      usage: { ...usage },
    });

    // Keep only last 60 samples
    if (this.samples.length > 60) {
      this.samples = this.samples.slice(-60);
    }

    // Check for potential leaks
    this.analyzeSamples();
  }

  /**
   * Analyze samples for leak patterns
   */
  private analyzeSamples(): void {
    if (this.samples.length < 10) {
      return;
    }

    const recent = this.samples.slice(-10);
    const older = this.samples.slice(-20, -10);

    if (older.length === 0) {
      return;
    }

    const recentAvg = recent.reduce((sum, s) => sum + s.usage.heapUsed, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.usage.heapUsed, 0) / older.length;

    const growthRate = (recentAvg - olderAvg) / olderAvg;

    // Alert if memory is growing consistently
    if (growthRate > 0.1) { // 10% growth
      logger.warn('Potential memory leak detected', {
        growthRate: `${(growthRate * 100).toFixed(2)}%`,
        olderAvg: formatBytes(olderAvg),
        recentAvg: formatBytes(recentAvg),
        samples: this.samples.length,
      });
    }
  }

  /**
   * Get memory trend analysis
   */
  getTrendAnalysis(): {
    samples: number;
    trend: 'growing' | 'stable' | 'decreasing';
    growthRate: number;
    currentUsage: string;
    peakUsage: string;
  } {
    if (this.samples.length < 2) {
      return {
        samples: this.samples.length,
        trend: 'stable',
        growthRate: 0,
        currentUsage: formatBytes(process.memoryUsage().heapUsed),
        peakUsage: formatBytes(process.memoryUsage().heapUsed),
      };
    }

    const first = this.samples[0].usage.heapUsed;
    const last = this.samples[this.samples.length - 1].usage.heapUsed;
    const peak = Math.max(...this.samples.map(s => s.usage.heapUsed));
    const growthRate = (last - first) / first;

    let trend: 'growing' | 'stable' | 'decreasing';
    if (growthRate > 0.05) {
      trend = 'growing';
    } else if (growthRate < -0.05) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      samples: this.samples.length,
      trend,
      growthRate,
      currentUsage: formatBytes(last),
      peakUsage: formatBytes(peak),
    };
  }
}

/**
 * Global memory manager instance
 */
export const memoryManager = MemoryManager.getInstance();

/**
 * Global memory leak detector instance
 */
export const memoryLeakDetector = MemoryLeakDetector.getInstance();