/**
 * Redaction middleware to sanitize sensitive values prior to logging
 */

export interface RedactionOptions {
  preserveStructure?: boolean;
  maskChar?: string;
  keepStart?: number;
  keepEnd?: number;
}

export interface RedactionPattern {
  name: string;
  pattern: RegExp;
  replacer: string | ((match: string, ...groups: any[]) => string);
}

const DEFAULT_OPTIONS: RedactionOptions = {
  preserveStructure: true,
  maskChar: '*',
  keepStart: 2,
  keepEnd: 2,
};

// Common patterns for sensitive data
const REDACTION_PATTERNS: RedactionPattern[] = [
  {
    name: 'email',
    pattern: /\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    replacer: (match, localPart, domain) => {
      const localMasked = localPart.slice(0, 2) + '*'.repeat(localPart.length - 2);
      return `${localMasked}@${domain}`;
    }
  },
  {
    name: 'phone',
    pattern: /\b(\+?1[-.\s]?)?(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})\b/g,
    replacer: (match, country, number) => {
      const cleanNumber = number.replace(/[^\d]/g, '');
      return `***-***-${cleanNumber.slice(-4)}`;
    }
  },
  {
    name: 'api_key',
    pattern: /\b([a-zA-Z0-9_-]{20,})\b/g,
    replacer: (match) => {
      if (match.length < 8) return '***';
      return match.slice(0, 4) + '*'.repeat(match.length - 8) + match.slice(-4);
    }
  },
  {
    name: 'jwt_token',
    pattern: /\b(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)\b/g,
    replacer: 'eyJ***.***.***'
  },
  {
    name: 'password',
    pattern: /"password"\s*:\s*"([^"]+)"/gi,
    replacer: '"password": "***"'
  },
  {
    name: 'secret',
    pattern: /"secret"\s*:\s*"([^"]+)"/gi,
    replacer: '"secret": "***"'
  },
  {
    name: 'token',
    pattern: /"token"\s*:\s*"([^"]+)"/gi,
    replacer: '"token": "***"'
  },
  {
    name: 'credit_card',
    pattern: /\b(\d{4}[-\s]?){3}\d{4}\b/g,
    replacer: (match) => {
      const digits = match.replace(/[^\d]/g, '');
      return `****-****-****-${digits.slice(-4)}`;
    }
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
    replacer: '***-**-****'
  },
  {
    name: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacer: (match) => {
      const parts = match.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
];

/**
 * Redact sensitive information from a string
 */
export function redactString(input: string, options: RedactionOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = input;

  for (const { name, pattern, replacer } of REDACTION_PATTERNS) {
    result = result.replace(pattern, replacer);
  }

  return result;
}

/**
 * Redact sensitive information from an object recursively
 */
export function redactObject(obj: any, options: RedactionOptions = {}): any {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return redactString(obj, opts);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, opts));
  }

  if (typeof obj === 'object') {
    const redacted: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip redaction for known safe keys
      const safeKeys = ['id', 'title', 'description', 'status', 'category', 'severity', 'created', 'updated'];
      if (safeKeys.includes(key.toLowerCase())) {
        redacted[key] = redactObject(value, opts);
      } else {
        // For potentially sensitive keys, apply stronger redaction
        const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'credential'];
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          redacted[key] = typeof value === 'string' ? '***' : redactObject(value, opts);
        } else {
          redacted[key] = redactObject(value, opts);
        }
      }
    }

    return redacted;
  }

  return obj;
}

/**
 * Redact sensitive information from arguments before logging
 */
export function redactArgs(args: any, options: RedactionOptions = {}): any {
  return redactObject(args, options);
}

/**
 * Create a redacted JSON string for logging
 */
export function redactJSON(obj: any, options: RedactionOptions = {}): string {
  try {
    const redacted = redactObject(obj, options);
    return JSON.stringify(redacted, null, 2);
  } catch (error) {
    return `[Redaction failed: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Check if a string contains potentially sensitive information
 */
export function containsSensitiveData(input: string): boolean {
  for (const { pattern } of REDACTION_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}

/**
 * Get summary of what was redacted from input
 */
export function getRedactionSummary(input: string): Array<{ type: string; count: number }> {
  const summary: Array<{ type: string; count: number }> = [];

  for (const { name, pattern } of REDACTION_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      summary.push({
        type: name,
        count: matches.length
      });
    }
  }

  return summary;
}

/**
 * Safe console.log replacement with redaction
 */
export function safeLog(message: string, data?: any, options: RedactionOptions = {}) {
  console.log(message);

  if (data !== undefined) {
    const redacted = redactObject(data, options);
    console.log('Data (redacted):', redacted);

    // Optional: log what was redacted
    if (options.preserveStructure && typeof data === 'object') {
      const summary = getRedactionSummary(JSON.stringify(data));
      if (summary.length > 0) {
        console.log('Redacted:', summary);
      }
    }
  }
}