/**
 * Skill: Parse logs, create incident, attach draft solution, apply tags
 * Pure function with clear I/O contracts
 */

import { callMCPTool } from '../helpers/callMCPTool.js';
import { redactArgs, redactJSON } from '../helpers/redact.js';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface TriageConfig {
  severityThresholds: Record<string, string>;
  categoryKeywords: Record<string, string[]>;
  autoCreateIncident: boolean;
  maxIncidentsPerBatch: number;
  sampleSize: number;
}

export interface TriageResult {
  processedLogCount: number;
  incidentsCreated: number;
  incidentsSkipped: number;
  errors: string[];
  createdIncidentIds: string[];
  summary: string;
}

export interface LogParsingOptions {
  logFormat?: 'json' | 'text' | 'apache' | 'nginx' | 'custom';
  timestampFormat?: string;
  severityField?: string;
  messageField?: string;
  customParser?: (line: string) => LogEntry | null;
}

const DEFAULT_CONFIG: TriageConfig = {
  severityThresholds: {
    'error': 'high',
    'critical': 'critical',
    'warn': 'medium',
    'warning': 'medium',
    'info': 'low',
    'debug': 'low'
  },
  categoryKeywords: {
    'Backend': ['api', 'server', 'database', 'backend', 'service', 'microservice'],
    'Frontend': ['ui', 'frontend', 'client', 'browser', 'javascript', 'react', 'vue'],
    'DevOps': ['deploy', 'ci', 'cd', 'docker', 'kubernetes', 'infrastructure'],
    'Health': ['health', 'monitoring', 'metrics', 'alert', 'heartbeat'],
    'Finance': ['payment', 'billing', 'subscription', 'transaction'],
    'Mobile': ['mobile', 'ios', 'android', 'app', 'phone']
  },
  autoCreateIncident: true,
  maxIncidentsPerBatch: 5,
  sampleSize: 10
};

/**
 * Parse log lines into structured LogEntry objects
 */
export function parseLogLines(
  logContent: string,
  options: LogParsingOptions = {}
): LogEntry[] {
  const lines = logContent.split('\n').filter(line => line.trim());
  const entries: LogEntry[] = [];

  for (const line of lines) {
    let entry: LogEntry | null = null;

    switch (options.logFormat) {
      case 'json':
        try {
          const parsed = JSON.parse(line);
          entry = {
            timestamp: parsed.timestamp || parsed.time || parsed['@timestamp'] || new Date().toISOString(),
            level: parsed.level || parsed.severity || 'info',
            message: parsed.message || parsed.msg || line,
            source: parsed.source || parsed.service,
            metadata: parsed
          };
        } catch (e) {
          // Fallback to text parsing if JSON fails
          entry = parseTextLogLine(line);
        }
        break;

      case 'apache':
        entry = parseApacheLogLine(line);
        break;

      case 'nginx':
        entry = parseNginxLogLine(line);
        break;

      case 'custom':
        if (options.customParser) {
          entry = options.customParser(line);
        }
        break;

      case 'text':
      default:
        entry = parseTextLogLine(line);
        break;
    }

    if (entry) {
      entries.push(entry);
    }
  }

  return entries;
}

/**
 * Parse standard text log line
 */
function parseTextLogLine(line: string): LogEntry | null {
  // Common log patterns
  const patterns = [
    // ISO timestamp + level + message
    /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?)\s+(\w+)\s+(.+)$/,
    // [timestamp] level: message
    /^\[([^\]]+)\]\s+(\w+):\s+(.+)$/,
    // timestamp [level] message
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s+\[(\w+)\]\s+(.+)$/,
    // Simple format: level message
    /^(\w+):\s+(.+)$/
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const [, timestamp, level, message] = match;
      return {
        timestamp: timestamp || new Date().toISOString(),
        level: level?.toLowerCase() || 'info',
        message: message || line,
        source: 'unknown'
      };
    }
  }

  // If no pattern matches, treat as info message
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: line,
    source: 'unknown'
  };
}

/**
 * Parse Apache log line
 */
function parseApacheLogLine(line: string): LogEntry | null {
  // Apache combined log format pattern
  const apachePattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+|-)/;
  const match = line.match(apachePattern);

  if (match) {
    const [, ip, timestamp, method, path, protocol, status, size] = match;
    const statusCode = parseInt(status);

    let level = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warn';

    return {
      timestamp,
      level,
      message: `${method} ${path} ${protocol} - ${status}`,
      source: 'apache',
      metadata: { ip, method, path, protocol, status: statusCode, size }
    };
  }

  return null;
}

/**
 * Parse Nginx log line
 */
function parseNginxLogLine(line: string): LogEntry | null {
  // Nginx default log format pattern
  const nginxPattern = /^(\S+) - \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d{3}) (\d+) "([^"]*)" "([^"]*)"/;
  const match = line.match(nginxPattern);

  if (match) {
    const [, ip, timestamp, method, path, protocol, status, size, referer, userAgent] = match;
    const statusCode = parseInt(status);

    let level = 'info';
    if (statusCode >= 500) level = 'error';
    else if (statusCode >= 400) level = 'warn';

    return {
      timestamp,
      level,
      message: `${method} ${path} ${protocol} - ${status}`,
      source: 'nginx',
      metadata: { ip, method, path, protocol, status: statusCode, size, referer, userAgent }
    };
  }

  return null;
}

/**
 * Determine incident category from log entry
 */
function determineCategory(entry: LogEntry, config: TriageConfig): string {
  const message = entry.message.toLowerCase();
  const source = (entry.source || '').toLowerCase();

  for (const [category, keywords] of Object.entries(config.categoryKeywords)) {
    for (const keyword of keywords) {
      if (message.includes(keyword) || source.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Backend'; // Default category
}

/**
 * Extract context information from log entries
 */
function extractContext(entries: LogEntry[], index: number, config: TriageConfig): string {
  const start = Math.max(0, index - 5);
  const end = Math.min(entries.length, index + 6);

  const contextEntries = entries.slice(start, end).map(entry =>
    `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`
  );

  return contextEntries.join('\n');
}

/**
 * Group similar log entries to avoid duplicate incidents
 */
function groupSimilarEntries(entries: LogEntry[]): LogEntry[][] {
  const groups: LogEntry[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < entries.length; i++) {
    if (processed.has(i)) continue;

    const group = [entries[i]];
    processed.add(i);

    // Find similar entries (same level and similar message)
    for (let j = i + 1; j < entries.length; j++) {
      if (processed.has(j)) continue;

      const entry1 = entries[i];
      const entry2 = entries[j];

      if (entry1.level === entry2.level &&
          entry1.source === entry2.source &&
          calculateMessageSimilarity(entry1.message, entry2.message) > 0.7) {
        group.push(entry2);
        processed.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Calculate similarity between two messages
 */
function calculateMessageSimilarity(msg1: string, msg2: string): number {
  const words1 = msg1.toLowerCase().split(/\s+/);
  const words2 = msg2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Create incident from log entry
 */
async function createIncidentFromLog(
  entry: LogEntry,
  context: string,
  config: TriageConfig
): Promise<{ incidentId?: string; error?: string }> {
  try {
    const severity = config.severityThresholds[entry.level] || 'low';
    const category = determineCategory(entry, config);

    const incidentData = {
      title: `${entry.level.toUpperCase()}: ${entry.message.slice(0, 100)}${entry.message.length > 100 ? '...' : ''}`,
      category,
      description: `Log entry detected at ${entry.timestamp} from ${entry.source || 'unknown'}`,
      symptoms: entry.message,
      context,
      environment: entry.source || 'unknown',
      severity,
      visibility: 'team',
      frequency: 'one-time'
    };

    const result = await callMCPTool('create_incident', incidentData);

    if (result.success && result.data) {
      return { incidentId: result.data.id };
    } else {
      return { error: result.error || 'Failed to create incident' };
    }

  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Main triage function - pure function with clear I/O
 */
export async function triageFromLogfile(
  logContent: string,
  config: Partial<TriageConfig> = {},
  parsingOptions: LogParsingOptions = {}
): Promise<TriageResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const result: TriageResult = {
    processedLogCount: 0,
    incidentsCreated: 0,
    incidentsSkipped: 0,
    errors: [],
    createdIncidentIds: [],
    summary: ''
  };

  try {
    // Step 1: Parse log entries
    console.log('📋 Parsing log content...');
    const entries = parseLogLines(logContent, parsingOptions);
    result.processedLogCount = entries.length;

    console.log(`📊 Parsed ${entries.length} log entries`);

    // Step 2: Filter entries by severity threshold
    const errorEntries = entries.filter(entry => {
      const severity = finalConfig.severityThresholds[entry.level] || 'low';
      return ['high', 'critical'].includes(severity);
    });

    console.log(`🔍 Found ${errorEntries.length} entries requiring attention`);

    if (errorEntries.length === 0) {
      result.summary = 'No incidents created: no high-priority log entries found';
      return result;
    }

    // Step 3: Group similar entries to avoid duplicates
    const groupedEntries = groupSimilarEntries(errorEntries);
    console.log(`📦 Grouped into ${groupedEntries.length} unique incidents`);

    // Step 4: Process each group (limit to maxIncidentsPerBatch)
    const groupsToProcess = groupedEntries.slice(0, finalConfig.maxIncidentsPerBatch);

    for (let i = 0; i < groupsToProcess.length; i++) {
      const group = groupsToProcess[i];
      const representativeEntry = group[0]; // Use first entry as representative
      const entryIndex = entries.indexOf(representativeEntry);

      console.log(`🎯 Processing incident ${i + 1}/${groupsToProcess.length}: ${representativeEntry.message.slice(0, 50)}...`);

      // Extract context around the log entry
      const context = extractContext(entries, entryIndex, finalConfig);

      // Create incident
      const incidentResult = await createIncidentFromLog(representativeEntry, context, finalConfig);

      if (incidentResult.incidentId) {
        result.incidentsCreated++;
        result.createdIncidentIds.push(incidentResult.incidentId);
        console.log(`✅ Created incident: ${incidentResult.incidentId}`);
      } else {
        result.errors.push(`Failed to create incident for log entry: ${incidentResult.error}`);
        result.incidentsSkipped++;
      }
    }

    // Step 5: Generate summary
    const skippedCount = groupedEntries.length - groupsToProcess.length;
    result.incidentsSkipped += skippedCount;

    result.summary = `
📋 Log Triage Summary:
- Log entries processed: ${result.processedLogCount}
- High-priority entries found: ${errorEntries.length}
- Incidents created: ${result.incidentsCreated}
- Incidents skipped: ${result.incidentsSkipped}
- Errors encountered: ${result.errors.length}

Created incident IDs: ${result.createdIncidentIds.join(', ') || 'None'}
    `.trim();

    console.log(result.summary);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Triage process failed: ${errorMessage}`);
    console.error('❌ Triage failed:', errorMessage);
  }

  return result;
}

/**
 * Quick triage for recent errors (last N minutes)
 */
export async function triageRecentErrors(
  logContent: string,
  minutesAgo: number = 60,
  config: Partial<TriageConfig> = {}
): Promise<TriageResult> {
  const entries = parseLogLines(logContent);
  const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);

  const recentEntries = entries.filter(entry =>
    new Date(entry.timestamp) >= cutoffTime
  );

  console.log(`🕐 Found ${recentEntries.length} entries from last ${minutesAgo} minutes`);

  if (recentEntries.length === 0) {
    return {
      processedLogCount: entries.length,
      incidentsCreated: 0,
      incidentsSkipped: 0,
      errors: [],
      createdIncidentIds: [],
      summary: `No log entries found in the last ${minutesAgo} minutes`
    };
  }

  return triageFromLogfile(recentEntries.map(e => `${e.timestamp} ${e.level}: ${e.message}`).join('\n'), config);
}