/**
 * Enhanced error handling utilities
 */

export enum ErrorCode {
  // Validation errors (1000-1999)
  VALIDATION_ERROR = 1000,
  INVALID_INPUT = 1001,
  MISSING_REQUIRED_FIELD = 1002,
  INVALID_ENUM_VALUE = 1003,
  STRING_TOO_LONG = 1004,
  STRING_TOO_SHORT = 1005,
  INVALID_FORMAT = 1006,

  // Authentication errors (2000-2999)
  AUTHENTICATION_FAILED = 2000,
  UNAUTHORIZED = 2001,
  TOKEN_EXPIRED = 2002,
  INVALID_CREDENTIALS = 2003,

  // Database errors (3000-3999)
  DATABASE_ERROR = 3000,
  CONNECTION_FAILED = 3001,
  QUERY_FAILED = 3002,
  RECORD_NOT_FOUND = 3003,
  DUPLICATE_RECORD = 3004,
  FOREIGN_KEY_VIOLATION = 3005,

  // Business logic errors (4000-4999)
  INCIDENT_NOT_FOUND = 4000,
  INVALID_STATUS_TRANSITION = 4001,
  SOLUTION_ALREADY_EXISTS = 4002,
  LESSON_ALREADY_EXISTS = 4003,

  // System errors (5000-5999)
  INTERNAL_SERVER_ERROR = 5000,
  RATE_LIMIT_EXCEEDED = 5001,
  SERVICE_UNAVAILABLE = 5002,
  TIMEOUT_ERROR = 5003,
  MEMORY_LIMIT_EXCEEDED = 5004,

  // Network errors (6000-6999)
  NETWORK_ERROR = 6000,
  CONNECTION_TIMEOUT = 6001,
  READ_TIMEOUT = 6002,
  WRITE_TIMEOUT = 6003,
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  operation?: string;
  requestId?: string;
  userId?: string;
  resource?: string;
  input?: any;
  stack?: string;
  timestamp?: string;
  retryCount?: number;
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  context?: ErrorContext;
  cause?: Error;
  retryable: boolean;
  userMessage: string;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly timestamp: string;

  constructor(details: ErrorDetails) {
    super(details.message);

    this.name = this.constructor.name;
    this.code = details.code;
    this.severity = details.severity;
    this.context = details.context;
    this.cause = details.cause;
    this.retryable = details.retryable;
    this.userMessage = details.userMessage;
    this.timestamp = details.timestamp || new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      userMessage: this.userMessage,
      retryable: this.retryable,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      } : undefined,
    };
  }

  /**
   * Get user-friendly response
   */
  toResponse(): { content: Array<{ type: string; text: string }>; isError: boolean } {
    return {
      content: [
        {
          type: 'text',
          text: this.userMessage
        }
      ],
      isError: true
    };
  }
}

/**
 * Error factory functions
 */
export const ErrorFactory = {
  /**
   * Create validation error
   */
  validation(message: string, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.VALIDATION_ERROR,
      message: `Validation error: ${message}`,
      userMessage: `Invalid input: ${message}`,
      severity: ErrorSeverity.LOW,
      retryable: false,
      context,
    });
  },

  /**
   * Create invalid input error
   */
  invalidInput(field: string, reason: string, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.INVALID_INPUT,
      message: `Invalid input for field '${field}': ${reason}`,
      userMessage: `The ${field} field is invalid: ${reason}`,
      severity: ErrorSeverity.LOW,
      retryable: false,
      context,
    });
  },

  /**
   * Create missing field error
   */
  missingField(field: string, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.MISSING_REQUIRED_FIELD,
      message: `Missing required field: ${field}`,
      userMessage: `The ${field} field is required`,
      severity: ErrorSeverity.LOW,
      retryable: false,
      context,
    });
  },

  /**
   * Create database error
   */
  database(message: string, cause?: Error, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.DATABASE_ERROR,
      message: `Database error: ${message}`,
      userMessage: 'A database error occurred. Please try again later.',
      severity: ErrorSeverity.HIGH,
      retryable: true,
      context,
      cause,
    });
  },

  /**
   * Create record not found error
   */
  notFound(resource: string, id: string, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.RECORD_NOT_FOUND,
      message: `${resource} with ID '${id}' not found`,
      userMessage: `The requested ${resource.toLowerCase()} was not found`,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      context,
    });
  },

  /**
   * Create incident not found error
   */
  incidentNotFound(id: string, context?: ErrorContext): AppError {
    return ErrorFactory.notFound('Incident', id, context);
  },

  /**
   * Create unauthorized error
   */
  unauthorized(message: string = 'Unauthorized access', context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.UNAUTHORIZED,
      message: `Unauthorized: ${message}`,
      userMessage: 'You are not authorized to perform this action',
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      context,
    });
  },

  /**
   * Create rate limit error
   */
  rateLimitExceeded(context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      userMessage: 'Too many requests. Please wait before trying again.',
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      context,
    });
  },

  /**
   * Create internal server error
   */
  internal(message: string, cause?: Error, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: `Internal server error: ${message}`,
      userMessage: 'An unexpected error occurred. Please try again later.',
      severity: ErrorSeverity.CRITICAL,
      retryable: true,
      context,
      cause,
    });
  },

  /**
   * Create timeout error
   */
  timeout(operation: string, timeoutMs: number, context?: ErrorContext): AppError {
    return new AppError({
      code: ErrorCode.TIMEOUT_ERROR,
      message: `Operation '${operation}' timed out after ${timeoutMs}ms`,
      userMessage: 'The operation took too long to complete. Please try again.',
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      context,
    });
  },
};

/**
 * Error handler middleware
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, number> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error with proper logging and response
   */
  handle(error: Error, context?: ErrorContext): AppError {
    const appError = this.normalizeError(error, context);

    // Log the error
    this.logError(appError);

    // Track error patterns
    this.trackError(appError);

    return appError;
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: Error, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle common error types
    if (error.message.includes('timeout')) {
      return ErrorFactory.timeout(context?.operation || 'unknown', 30000, context);
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new AppError({
        code: ErrorCode.NETWORK_ERROR,
        message: `Network error: ${error.message}`,
        userMessage: 'Network connection failed. Please check your connection.',
        severity: ErrorSeverity.HIGH,
        retryable: true,
        context,
        cause: error,
      });
    }

    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return ErrorFactory.unauthorized(error.message, context);
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return new AppError({
        code: ErrorCode.RECORD_NOT_FOUND,
        message: error.message,
        userMessage: 'The requested resource was not found',
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        context,
        cause: error,
      });
    }

    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return ErrorFactory.rateLimitExceeded(context);
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return ErrorFactory.validation(error.message, context);
    }

    // Default to internal server error
    return ErrorFactory.internal(error.message, error, context);
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError): void {
    const logData = {
      error: error.toJSON(),
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        console.warn('Low severity error:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.error('Medium severity error:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('High severity error:', logData);
        break;
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL ERROR:', logData);
        break;
    }
  }

  /**
   * Track error patterns for monitoring
   */
  private trackError(error: AppError): void {
    const key = `${error.code}:${error.message.substring(0, 50)}`;

    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    this.lastErrors.set(key, Date.now());

    // Clean up old entries
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    for (const [errorKey, timestamp] of this.lastErrors.entries()) {
      if (timestamp < oneHourAgo) {
        this.errorCounts.delete(errorKey);
        this.lastErrors.delete(errorKey);
      }
    }
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    recentErrors: Array<{ key: string; count: number; lastSeen: number }>;
  } {
    const errorsByCode: Record<string, number> = {};
    const recentErrors: Array<{ key: string; count: number; lastSeen: number }> = [];

    for (const [key, count] of this.errorCounts.entries()) {
      const code = key.split(':')[0];
      errorsByCode[code] = (errorsByCode[code] || 0) + count;

      const lastSeen = this.lastErrors.get(key) || 0;
      recentErrors.push({ key, count, lastSeen });
    }

    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorsByCode,
      recentErrors: recentErrors.sort((a, b) => b.lastSeen - a.lastSeen).slice(0, 10),
    };
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Retry mechanism for retryable operations
 */
export class RetryHandler {
  /**
   * Execute function with retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
      shouldRetry?: (error: Error) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
      shouldRetry = (error) => {
        if (error instanceof AppError) {
          return error.retryable;
        }
        return false;
      },
    } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries || !shouldRetry(lastError)) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

        console.warn(`Retrying operation after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError.message);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }
}

/**
 * Circuit breaker for handling failing services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private options: {
      failureThreshold: number;
      recoveryTime: number;
      monitoringPeriod: number;
    }
  ) {}

  /**
   * Execute operation with circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.options.recoveryTime) {
        throw ErrorFactory.serviceUnavailable('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}