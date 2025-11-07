/**
 * Helper for calling MCP tools with chunked handling and summary logging
 */

import { createIncident } from '../servers/notebypine/createIncident.js';
import { searchIncidents } from '../servers/notebypine/searchIncidents.js';
import { addSolution } from '../servers/notebypine/addSolution.js';
import { extractLessons } from '../servers/notebypine/extractLessons.js';
import { exportKnowledge } from '../servers/notebypine/exportKnowledge.js';
import { redactArgs, redactJSON, safeLog } from './redact.js';

export interface MCPToolOptions {
  enableChunking?: boolean;
  chunkSize?: number;
  sampleSize?: number;
  verbose?: boolean;
  redactSensitive?: boolean;
}

export interface MCPToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  summary?: string;
  chunks?: T[];
  totalItems?: number;
}

const DEFAULT_OPTIONS: MCPToolOptions = {
  enableChunking: true,
  chunkSize: 10,
  sampleSize: 5,
  verbose: false,
  redactSensitive: true,
};

/**
 * Create a summary of data for logging with redaction
 */
function createSummary(data: any, sampleSize: number = 5, redact: boolean = true): string {
  if (!data) return 'No data returned';

  let processedData = data;

  // Apply redaction if requested
  if (redact) {
    processedData = redactArgs(data);
  }

  if (Array.isArray(processedData)) {
    const total = processedData.length;
    if (total === 0) return 'Empty array returned';

    const sample = processedData.slice(0, sampleSize);
    const samplePreview = sample.map(item =>
      typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)
    ).join('\n');

    return `Array with ${total} items. Sample (${Math.min(sampleSize, total)} items):\n${samplePreview}${total > sampleSize ? '\n... (more items truncated)' : ''}`;
  }

  if (typeof processedData === 'object') {
    const preview = JSON.stringify(processedData, null, 2);
    const lines = preview.split('\n');
    if (lines.length > sampleSize * 2) {
      return `Object with ${Object.keys(processedData).length} keys. Preview:\n${lines.slice(0, sampleSize * 2).join('\n')}\n... (truncated)`;
    }
    return `Object:\n${preview}`;
  }

  return `Data: ${String(processedData)}`;
}

/**
 * Split array data into chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Call MCP tool with enhanced logging and chunking
 */
export async function callMCPTool<T = any>(
  toolName: string,
  args: any,
  options: MCPToolOptions = {}
): Promise<MCPToolResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  console.log(`🔧 [MCP] Calling tool: ${toolName}`);

  if (opts.verbose) {
    const redactedArgs = opts.redactSensitive ? redactJSON(args) : JSON.stringify(args, null, 2);
    console.log(`📝 [MCP] Args:`, redactedArgs);
  } else {
    const argKeys = Object.keys(args);
    console.log(`📝 [MCP] Args:`, argKeys.join(', '));

    // Still check for sensitive data in non-verbose mode
    if (opts.redactSensitive) {
      const argsStr = JSON.stringify(args);
      if (argsStr.includes('password') || argsStr.includes('secret') || argsStr.includes('token')) {
        console.log(`🔒 [MCP] Sensitive data detected and redacted`);
      }
    }
  }

  try {
    let result: any;

    // Route to appropriate tool
    switch (toolName) {
      case 'create_incident':
        result = await createIncident(args);
        break;

      case 'search_incidents':
        result = await searchIncidents(args);
        break;

      case 'add_solution':
        result = await addSolution(args);
        break;

      case 'extract_lessons':
        result = await extractLessons(args);
        break;

      case 'export_knowledge':
        result = await exportKnowledge(args);
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [MCP] Tool ${toolName} completed in ${duration}ms`);

    // Handle chunking for array results
    let chunks: T[] | undefined;
    let totalItems: number | undefined;
    let processedResult = result;

    if (opts.enableChunking && Array.isArray(result)) {
      totalItems = result.length;
      chunks = chunkArray(result, opts.chunkSize);

      if (!opts.verbose && totalItems > opts.sampleSize!) {
        // For non-verbose mode, return only sample for logging
        processedResult = result.slice(0, opts.sampleSize);
      }
    }

    // Create summary for logging with redaction
    const summary = createSummary(processedResult, opts.sampleSize, opts.redactSensitive);
    console.log(`📊 [MCP] Result summary for ${toolName}:\n${summary}`);

    return {
      success: true,
      data: result,
      summary,
      chunks: chunks as any,
      totalItems,
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error(`❌ [MCP] Tool ${toolName} failed in ${duration}ms:`, message);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get tool names available for calling
 */
export function getAvailableTools(): string[] {
  return [
    'create_incident',
    'search_incidents',
    'add_solution',
    'extract_lessons',
    'export_knowledge',
  ];
}

/**
 * Batch call multiple tools
 */
export async function batchCallMCPTools(
  calls: Array<{ toolName: string; args: any; options?: MCPToolOptions }>
): Promise<MCPToolResult[]> {
  console.log(`🔄 [MCP] Batch calling ${calls.length} tools`);

  const results = await Promise.all(
    calls.map(({ toolName, args, options }) =>
      callMCPTool(toolName, args, options)
    )
  );

  const successCount = results.filter(r => r.success).length;
  console.log(`📊 [MCP] Batch completed: ${successCount}/${calls.length} successful`);

  return results;
}