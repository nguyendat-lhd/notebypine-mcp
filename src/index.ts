#!/usr/bin/env bun
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerTools } from './mcp/tools.js';
import { registerResources } from './mcp/resources.js';
import { registerPrompts } from './mcp/prompts.js';
import { initPocketBase, ensurePocketBaseReady } from './db/pocketbase.js';
import { logger, LogLevel } from './utils/logger.js';
import { memoryManager, memoryLeakDetector } from './utils/memory.js';
import { performanceMonitor } from './utils/performance.js';
import { responseCache } from './utils/cache.js';
import { CacheManager } from './db/queries.js';
import { config } from './config.js';

const server = new Server(
  {
    name: 'notebypine-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

async function startServer() {
  const endTimer = logger.startTimer('server_startup');

  try {
    logger.info('Starting NoteByPine MCP Server', {
      version: '1.0.0',
      environment: config.env,
      nodeVersion: process.version,
    });

    // Initialize performance monitoring
    logger.info('Initializing performance monitoring');

    // Initialize memory management
    memoryManager.updateConfig({
      maxHeapSize: 512 * 1024 * 1024, // 512MB
      warningThreshold: 0.8,
      cleanupInterval: 30000, // 30 seconds
      enableAutoGC: true,
    });

    // Start memory leak detection in non-production environments
    if (config.env !== 'production') {
      memoryLeakDetector.startMonitoring(60000); // 1 minute intervals
    }

    logger.info('Performance monitoring initialized');

    // Initialize PocketBase with retry logic
    logger.info('Initializing PocketBase connection');
    await ensurePocketBaseReady();
    await initPocketBase();
    logger.info('PocketBase initialized successfully');

    // Warm up caches
    logger.info('Warming up caches');
    await CacheManager.warmUp();
    logger.info('Cache warm-up completed');

    // Register all MCP capabilities
    logger.info('Registering MCP capabilities');
    registerTools(server);
    registerResources(server);
    registerPrompts(server);
    logger.info('MCP capabilities registered');

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    endTimer();
    logger.info('NoteByPine MCP Server started successfully', {
      transport: 'stdio',
      memoryUsage: process.memoryUsage(),
    });

    // Log startup statistics
    const memoryStats = memoryManager.getMemoryStats();
    logger.info('Startup statistics', {
      heapUsed: `${(memoryStats.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memoryStats.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      usageRatio: `${(memoryStats.usageRatio * 100).toFixed(2)}%`,
    });

  } catch (error) {
    endTimer();
    logger.error('Failed to start server', error instanceof Error ? error : String(error));
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function handleShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Stop accepting new requests
    logger.info('Stopping new request processing');

    // Wait for ongoing requests to complete (with timeout)
    const shutdownTimeout = 10000; // 10 seconds
    const shutdownStart = Date.now();

    // Check if there are active requests
    const perfSummary = performanceMonitor.getSummary();
    if (perfSummary.activeRequests > 0) {
      logger.info('Waiting for active requests to complete', {
        activeRequests: perfSummary.activeRequests,
        timeout: shutdownTimeout,
      });

      while (perfSummary.activeRequests > 0 && Date.now() - shutdownStart < shutdownTimeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedSummary = performanceMonitor.getSummary();
        perfSummary.activeRequests = updatedSummary.activeRequests;
      }

      if (perfSummary.activeRequests > 0) {
        logger.warn('Shutdown timeout reached, forcing exit', {
          remainingRequests: perfSummary.activeRequests,
        });
      }
    }

    // Cleanup resources
    logger.info('Cleaning up resources');

    // Stop memory monitoring
    memoryManager.stopMonitoring();
    memoryLeakDetector.stopMonitoring();

    // Clear caches
    CacheManager.invalidateAll();
    responseCache.getStats(); // Trigger cleanup

    // Get final statistics
    const finalStats = {
      memory: memoryManager.getMemoryStats(),
      performance: performanceMonitor.getSummary(),
      cache: CacheManager.getStats(),
    };

    logger.info('Server shutdown completed', finalStats);

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', error instanceof Error ? error : String(error));
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason instanceof Error ? reason : String(reason), { promise });
  process.exit(1);
});

startServer();