/**
 * Enhanced logging utilities with structured logging and performance tracking
 */

import { performanceMonitor } from './performance.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  operation?: string;
  requestId?: string;
  duration?: number;
  error?: string;
  metadata?: Record<string, any>;
  memoryUsage?: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStructured: boolean;
  enablePerformanceLogging: boolean;
  maxLogEntries: number;
}

class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private static instance: Logger;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStructured: true,
      enablePerformanceLogging: true,
      maxLogEntries: 10000,
      ...config
    };
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Create log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>
  ): LogEntry {
    const memoryUsage = this.config.enablePerformanceLogging ? {
      rss: process.memoryUsage().rss,
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
    } : undefined;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      memoryUsage,
    };
  }

  /**
   * Add log entry
   */
  private addLog(entry: LogEntry): void {
    if (entry.level < this.config.level) {
      return;
    }

    // Add to internal logs
    this.logs.push(entry);

    // Keep only the latest entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Structured logging
    if (this.config.enableStructured) {
      this.logStructured(entry);
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${levelName}]`;

    let message = prefix;

    if (entry.operation) {
      message += ` [${entry.operation}]`;
    }

    if (entry.requestId) {
      message += ` [${entry.requestId.substring(0, 8)}]`;
    }

    message += `: ${entry.message}`;

    if (entry.duration !== undefined) {
      message += ` (${entry.duration}ms)`;
    }

    if (entry.error) {
      message += `\nError: ${entry.error}`;
    }

    if (entry.memoryUsage) {
      const { rss, heapUsed, heapTotal } = entry.memoryUsage;
      message += ` | Memory: RSS=${Math.round(rss / 1024 / 1024)}MB, Heap=${Math.round(heapUsed / 1024 / 1024)}MB/${Math.round(heapTotal / 1024 / 1024)}MB`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
        console.error(message);
        break;
    }
  }

  /**
   * Structured logging (JSON format)
   */
  private logStructured(entry: LogEntry): void {
    console.error(JSON.stringify(entry));
  }

  /**
   * Debug level logging
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, metadata);
    this.addLog(entry);
  }

  /**
   * Info level logging
   */
  info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, metadata);
    this.addLog(entry);
  }

  /**
   * Warning level logging
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, metadata);
    this.addLog(entry);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | string, metadata?: Record<string, any>): void {
    const errorMessage = error instanceof Error ? error.message : error;
    const entry = this.createLogEntry(LogLevel.ERROR, message, {
      ...metadata,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    this.addLog(entry);
  }

  /**
   * Performance logging
   */
  performance(operation: string, duration: number, success: boolean, requestId?: string): void {
    const message = `Operation ${operation} ${success ? 'completed' : 'failed'}`;
    const entry = this.createLogEntry(
      success ? LogLevel.INFO : LogLevel.WARN,
      message,
      { operation, success }
    );

    entry.operation = operation;
    entry.requestId = requestId;
    entry.duration = duration;

    this.addLog(entry);

    // Log warning if operation exceeds expected threshold
    if (duration > 1000) {
      this.warn(`Slow operation detected: ${operation} took ${duration}ms`, {
        operation,
        duration,
        requestId,
      });
    }
  }

  /**
   * Start operation timer
   */
  startTimer(operation: string, requestId?: string): () => void {
    const startTime = Date.now();
    this.debug(`Starting operation: ${operation}`, { operation, requestId });

    return () => {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, true, requestId);
    };
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs by operation
   */
  getLogsByOperation(operation: string): LogEntry[] {
    return this.logs.filter(log => log.operation === operation);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get log statistics
   */
  getStatistics(): {
    total: number;
    byLevel: Record<string, number>;
    averageResponseTime: number;
    errorRate: number;
  } {
    const byLevel: Record<string, number> = {};

    for (const level of Object.values(LogLevel)) {
      if (typeof level === 'string') {
        byLevel[level] = 0;
      }
    }

    let totalResponseTime = 0;
    let responseCount = 0;
    let errorCount = 0;

    for (const log of this.logs) {
      const levelName = LogLevel[log.level];
      byLevel[levelName] = (byLevel[levelName] || 0) + 1;

      if (log.duration !== undefined) {
        totalResponseTime += log.duration;
        responseCount++;
      }

      if (log.level === LogLevel.ERROR) {
        errorCount++;
      }
    }

    return {
      total: this.logs.length,
      byLevel,
      averageResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      errorRate: this.logs.length > 0 ? (errorCount / this.logs.length) * 100 : 0,
    };
  }
}

// Create default logger instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logDebug = (message: string, metadata?: Record<string, any>) => logger.debug(message, metadata);
export const logInfo = (message: string, metadata?: Record<string, any>) => logger.info(message, metadata);
export const logWarn = (message: string, metadata?: Record<string, any>) => logger.warn(message, metadata);
export const logError = (message: string, error?: Error | string, metadata?: Record<string, any>) => logger.error(message, error, metadata);
export const logPerformance = (operation: string, duration: number, success: boolean, requestId?: string) =>
  logger.performance(operation, duration, success, requestId);
export const startTimer = (operation: string, requestId?: string) => logger.startTimer(operation, requestId);