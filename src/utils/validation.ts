/**
 * Input validation and sanitization utilities
 */

import { z } from 'zod';
import { ErrorFactory, ErrorContext } from './errors.js';

/**
 * Sanitization utilities
 */
export class Sanitizer {
  /**
   * Sanitize string input
   */
  static string(input: any, options: {
    maxLength?: number;
    trim?: boolean;
    removeHTML?: boolean;
    normalizeWhitespace?: boolean;
  } = {}): string {
    if (input === null || input === undefined) {
      return '';
    }

    let str = String(input);

    if (options.trim) {
      str = str.trim();
    }

    if (options.removeHTML) {
      str = str.replace(/<[^>]*>/g, '');
    }

    if (options.normalizeWhitespace) {
      str = str.replace(/\s+/g, ' ').trim();
    }

    if (options.maxLength && str.length > options.maxLength) {
      str = str.substring(0, options.maxLength);
    }

    return str;
  }

  /**
   * Sanitize number input
   */
  static number(input: any, options: {
    min?: number;
    max?: number;
    integer?: boolean;
    default?: number;
  } = {}): number | null {
    if (input === null || input === undefined || input === '') {
      return options.default !== undefined ? options.default : null;
    }

    const num = Number(input);

    if (isNaN(num)) {
      return options.default !== undefined ? options.default : null;
    }

    if (options.integer && !Number.isInteger(num)) {
      return options.default !== undefined ? options.default : null;
    }

    if (options.min !== undefined && num < options.min) {
      return options.min;
    }

    if (options.max !== undefined && num > options.max) {
      return options.max;
    }

    return num;
  }

  /**
   * Sanitize email input
   */
  static email(input: any): string | null {
    if (!input) {
      return null;
    }

    const email = String(input).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email) ? email : null;
  }

  /**
   * Sanitize URL input
   */
  static url(input: any): string | null {
    if (!input) {
      return null;
    }

    try {
      const url = new URL(String(input).trim());
      return url.toString();
    } catch {
      return null;
    }
  }

  /**
   * Sanitize ID input (UUID or alphanumeric)
   */
  static id(input: any): string | null {
    if (!input) {
      return null;
    }

    const str = String(input).trim();

    // UUID regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Alphanumeric regex (for simpler IDs)
    const alphanumRegex = /^[a-zA-Z0-9_-]+$/;

    return uuidRegex.test(str) || alphanumRegex.test(str) ? str : null;
  }

  /**
   * Sanitize array input
   */
  static array<T>(input: any, sanitizer?: (item: any) => T): T[] {
    if (!Array.isArray(input)) {
      return [];
    }

    if (!sanitizer) {
      return input as T[];
    }

    return input.map(item => sanitizer(item)).filter(item => item !== null && item !== undefined) as T[];
  }

  /**
   * Sanitize JSON input
   */
  static json(input: any): any | null {
    if (typeof input === 'object' && input !== null) {
      return input;
    }

    try {
      return JSON.parse(String(input));
    } catch {
      return null;
    }
  }
}

/**
 * Validation schemas using Zod
 */
export const ValidationSchemas = {
  // Incident validation
  createIncident: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title must be less than 200 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    category: z.enum(['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'], {
      errorMap: () => ({ message: 'Category must be one of: Backend, Frontend, DevOps, Health, Finance, Mobile' })
    }),

    description: z.string()
      .min(1, 'Description is required')
      .max(5000, 'Description must be less than 5000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    severity: z.enum(['low', 'medium', 'high', 'critical'], {
      errorMap: () => ({ message: 'Severity must be one of: low, medium, high, critical' })
    }),

    symptoms: z.string()
      .max(2000, 'Symptoms must be less than 2000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true }))
      .optional(),

    context: z.string()
      .max(2000, 'Context must be less than 2000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true }))
      .optional(),

    environment: z.string()
      .max(1000, 'Environment must be less than 1000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true }))
      .optional(),

    frequency: z.enum(['one-time', 'occasional', 'frequent', 'recurring'])
      .default('one-time'),

    visibility: z.enum(['private', 'team', 'public'])
      .default('private'),
  }),

  // Search validation
  searchIncidents: z.object({
    query: z.string()
      .min(1, 'Search query is required')
      .max(500, 'Search query must be less than 500 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true })),

    category: z.enum(['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'])
      .optional(),

    severity: z.enum(['low', 'medium', 'high', 'critical'])
      .optional(),

    status: z.enum(['open', 'investigating', 'resolved', 'archived'])
      .optional(),

    limit: z.number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(10),
  }),

  // Solution validation
  addSolution: z.object({
    incident_id: z.string()
      .min(1, 'Incident ID is required')
      .transform(val => Sanitizer.id(val))
      .refine(val => val !== null, 'Invalid incident ID format'),

    solution_title: z.string()
      .min(1, 'Solution title is required')
      .max(200, 'Solution title must be less than 200 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    solution_description: z.string()
      .min(1, 'Solution description is required')
      .max(2000, 'Solution description must be less than 2000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    steps: z.string()
      .min(1, 'Steps are required')
      .max(5000, 'Steps must be less than 5000 characters')
      .transform(val => Sanitizer.string(val, { trim: true })),

    resources_needed: z.string()
      .max(1000, 'Resources needed must be less than 1000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true }))
      .optional(),

    time_estimate: z.string()
      .max(50, 'Time estimate must be less than 50 characters')
      .transform(val => Sanitizer.string(val, { trim: true }))
      .optional(),

    warnings: z.string()
      .max(1000, 'Warnings must be less than 1000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true }))
      .optional(),

    alternatives: z.string()
      .max(2000, 'Alternatives must be less than 2000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true }))
      .optional(),
  }),

  // Lessons learned validation
  extractLessons: z.object({
    incident_id: z.string()
      .min(1, 'Incident ID is required')
      .transform(val => Sanitizer.id(val))
      .refine(val => val !== null, 'Invalid incident ID format'),

    problem_summary: z.string()
      .min(1, 'Problem summary is required')
      .max(1000, 'Problem summary must be less than 1000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    root_cause: z.string()
      .min(1, 'Root cause is required')
      .max(2000, 'Root cause must be less than 2000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    prevention: z.string()
      .min(1, 'Prevention is required')
      .max(2000, 'Prevention must be less than 2000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true, normalizeWhitespace: true })),

    lesson_type: z.enum(['prevention', 'detection', 'response', 'recovery', 'general'])
      .default('general'),
  }),

  // Similar incidents validation
  getSimilarIncidents: z.object({
    incident_id: z.string()
      .min(1, 'Incident ID is required')
      .transform(val => Sanitizer.id(val))
      .refine(val => val !== null, 'Invalid incident ID format'),

    limit: z.number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(20, 'Limit cannot exceed 20')
      .default(5),
  }),

  // Update incident status validation
  updateIncidentStatus: z.object({
    incident_id: z.string()
      .min(1, 'Incident ID is required')
      .transform(val => Sanitizer.id(val))
      .refine(val => val !== null, 'Invalid incident ID format'),

    status: z.enum(['open', 'investigating', 'resolved', 'archived'], {
      errorMap: () => ({ message: 'Status must be one of: open, investigating, resolved, archived' })
    }),

    notes: z.string()
      .max(1000, 'Notes must be less than 1000 characters')
      .transform(val => Sanitizer.string(val, { trim: true, removeHTML: true }))
      .optional(),
  }),

  // Export knowledge validation
  exportKnowledge: z.object({
    format: z.enum(['json', 'csv', 'markdown'], {
      errorMap: () => ({ message: 'Format must be one of: json, csv, markdown' })
    }),

    filter: z.object({
      category: z.enum(['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'])
        .optional(),

      status: z.enum(['open', 'investigating', 'resolved', 'archived'])
        .optional(),

      severity: z.enum(['low', 'medium', 'high', 'critical'])
        .optional(),
    }).optional(),
  }),
};

/**
 * Validation class with error handling
 */
export class Validator {
  /**
   * Validate input against schema
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    input: any,
    context?: ErrorContext
  ): { data: T; error?: AppError } {
    try {
      const data = schema.parse(input);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
        const appError = ErrorFactory.validation(message, context);
        return { data: null as any, error: appError };
      }

      const appError = ErrorFactory.validation(
        error instanceof Error ? error.message : 'Unknown validation error',
        context
      );
      return { data: null as any, error: appError };
    }
  }

  /**
   * Validate and throw on error
   */
  static validateOrThrow<T>(
    schema: z.ZodSchema<T>,
    input: any,
    context?: ErrorContext
  ): T {
    const result = this.validate(schema, input, context);

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Partial validation (for updates)
   */
  static validatePartial<T>(
    schema: z.ZodSchema<T>,
    input: any,
    context?: ErrorContext
  ): { data: Partial<T>; error?: AppError } {
    try {
      const data = schema.partial().parse(input);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('; ');
        const appError = ErrorFactory.validation(message, context);
        return { data: {}, error: appError };
      }

      const appError = ErrorFactory.validation(
        error instanceof Error ? error.message : 'Unknown validation error',
        context
      );
      return { data: {}, error: appError };
    }
  }
}

/**
 * Input validation decorators
 */
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Assume first argument is the input to validate
      if (args.length > 0) {
        const context: ErrorContext = {
          operation: propertyName,
          input: args[0],
        };

        const result = Validator.validate(schema, args[0], context);
        if (result.error) {
          throw result.error;
        }

        // Replace with validated data
        args[0] = result.data;
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Security utilities
 */
export class Security {
  /**
   * Check for potentially dangerous content
   */
  static containsMaliciousContent(input: string): boolean {
    const maliciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize for XSS prevention
   */
  static sanitizeForXSS(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(--|\*\/|\/\*)/g,
      /(\bOR\b|\bAND\b).*=.*=/gi,
      /1=1/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate content security
   */
  static validateContent(input: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.containsMaliciousContent(input)) {
      issues.push('Potentially malicious script or content detected');
    }

    if (this.containsSQLInjection(input)) {
      issues.push('Potential SQL injection pattern detected');
    }

    if (input.length > 50000) {
      issues.push('Content too large');
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }
}