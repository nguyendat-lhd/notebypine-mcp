/**
 * Optimized MCP tools registration with performance enhancements
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import {
  handleCreateIncident,
  handleSearchIncidents,
  handleAddSolution,
  handleExtractLessons,
  handleGetSimilarIncidents,
  handleUpdateIncidentStatus,
  handleExportKnowledge,
} from './handlers.js';
import { logger, startTimer } from '../utils/logger.js';
import { performanceMonitor } from '../utils/performance.js';
import { responseCache } from '../utils/cache.js';

type ToolDefinition = Tool & {
  specPath: string;
};

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'create_incident',
    description: 'Create a structured incident record and surface the new PocketBase ID. Docs: docs/specs/tools/create_incident.md',
    specPath: 'docs/specs/tools/create_incident.md',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Brief title of the incident (max 200 characters)'
        },
        category: {
          type: 'string',
          enum: ['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'],
          description: 'Category of the incident'
        },
        description: {
          type: 'string',
          description: 'Detailed description of the problem'
        },
        symptoms: {
          type: 'string',
          description: 'List of symptoms observed (as text)'
        },
        context: {
          type: 'string',
          description: 'Context information (who, what, when, where, why, how)'
        },
        environment: {
          type: 'string',
          description: 'Environment details (OS, version, tools)'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Severity level'
        },
        visibility: {
          type: 'string',
          enum: ['private', 'team', 'public'],
          default: 'private',
          description: 'Visibility level'
        },
        frequency: {
          type: 'string',
          enum: ['one-time', 'occasional', 'frequent', 'recurring'],
          default: 'one-time',
          description: 'How often this issue occurs'
        }
      },
      required: ['title', 'category', 'description', 'severity']
    }
  },
  {
    name: 'search_incidents',
    description: 'Search incidents with keyword and enum filters for rapid triage. Docs: docs/specs/tools/search_incidents.md',
    specPath: 'docs/specs/tools/search_incidents.md',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - searches in title and description (max 500 characters)'
        },
        category: {
          type: 'string',
          enum: ['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'],
          description: 'Filter by category'
        },
        severity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Filter by severity level'
        },
        status: {
          type: 'string',
          enum: ['open', 'investigating', 'resolved', 'archived'],
          description: 'Filter by status'
        },
        limit: {
          type: 'number',
          default: 10,
          minimum: 1,
          maximum: 100,
          description: 'Maximum results to return'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'add_solution',
    description: 'Attach a solution record with step-by-step remediation details. Docs: docs/specs/tools/add_solution.md',
    specPath: 'docs/specs/tools/add_solution.md',
    inputSchema: {
      type: 'object',
      properties: {
        incident_id: {
          type: 'string',
          description: 'ID of the incident to add solution to'
        },
        solution_title: {
          type: 'string',
          description: 'Title of the solution'
        },
        solution_description: {
          type: 'string',
          description: 'Description of the solution'
        },
        steps: {
          type: 'string',
          description: 'Step-by-step instructions (can be JSON array or formatted text)'
        },
        resources_needed: {
          type: 'string',
          description: 'Resources needed to implement this solution'
        },
        time_estimate: {
          type: 'string',
          description: 'Estimated time (e.g., "30 minutes")'
        },
        warnings: {
          type: 'string',
          description: 'Warnings or precautions'
        },
        alternatives: {
          type: 'string',
          description: 'Alternative solutions'
        }
      },
      required: ['incident_id', 'solution_title', 'solution_description', 'steps']
    }
  },
  {
    name: 'extract_lessons',
    description: 'Log a lessons-learned entry and update the source incident root cause. Docs: docs/specs/tools/extract_lessons.md',
    specPath: 'docs/specs/tools/extract_lessons.md',
    inputSchema: {
      type: 'object',
      properties: {
        incident_id: {
          type: 'string',
          description: 'ID of the incident to extract lessons from'
        },
        problem_summary: {
          type: 'string',
          description: 'Summary of the problem'
        },
        root_cause: {
          type: 'string',
          description: 'Root cause analysis'
        },
        prevention: {
          type: 'string',
          description: 'How to prevent this in the future'
        },
        lesson_type: {
          type: 'string',
          enum: ['prevention', 'detection', 'response', 'recovery', 'general'],
          default: 'general',
          description: 'Type of lesson'
        }
      },
      required: ['incident_id', 'problem_summary', 'root_cause', 'prevention']
    }
  },
  {
    name: 'get_similar_incidents',
    description: 'Suggest incidents with overlapping signals to reuse fixes. Docs: docs/specs/tools/get_similar_incidents.md',
    specPath: 'docs/specs/tools/get_similar_incidents.md',
    inputSchema: {
      type: 'object',
      properties: {
        incident_id: {
          type: 'string',
          description: 'ID of the incident to find similarities for'
        },
        limit: {
          type: 'number',
          default: 5,
          minimum: 1,
          maximum: 20,
          description: 'Maximum number of similar incidents to return'
        }
      },
      required: ['incident_id']
    }
  },
  {
    name: 'update_incident_status',
    description: 'Move an incident through its lifecycle and record resolution timestamps. Docs: docs/specs/tools/update_incident_status.md',
    specPath: 'docs/specs/tools/update_incident_status.md',
    inputSchema: {
      type: 'object',
      properties: {
        incident_id: {
          type: 'string',
          description: 'ID of the incident to update'
        },
        status: {
          type: 'string',
          enum: ['open', 'investigating', 'resolved', 'archived'],
          description: 'New status'
        },
        notes: {
          type: 'string',
          description: 'Optional update notes'
        }
      },
      required: ['incident_id', 'status']
    }
  },
  {
    name: 'export_knowledge',
    description: 'Export the knowledge base in JSON, CSV, or Markdown for sharing. Docs: docs/specs/tools/export_knowledge.md',
    specPath: 'docs/specs/tools/export_knowledge.md',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['json', 'csv', 'markdown'],
          default: 'json',
          description: 'Export format'
        },
        filter: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile']
            },
            status: {
              type: 'string',
              enum: ['open', 'investigating', 'resolved', 'archived']
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical']
            }
          },
          description: 'Optional filters'
        }
      },
      required: ['format']
    }
  },
];

const TOOL_SUMMARIES = TOOL_DEFINITIONS.map(({ name, description, specPath }) => ({
  name,
  briefDescription: description,
  specPath,
}));

// Rate limiting for tool calls
const rateLimiter = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

/**
 * Check rate limit
 */
function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  const client = rateLimiter.get(clientId);

  if (!client || now > client.resetTime) {
    // Reset or create new entry
    rateLimiter.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (client.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  client.count++;
  return true;
}

/**
 * Generate client ID from request
 */
function getClientId(request: any): string {
  // Try to get client ID from request metadata
  return request.params?.meta?.clientId || 'anonymous';
}

/**
 * Pre-validate tool arguments
 */
function preValidateToolCall(name: string, args: any): { valid: boolean; error?: string } {
  switch (name) {
    case 'create_incident':
      if (!args.title || args.title.length > 200) {
        return { valid: false, error: 'Title is required and must be less than 200 characters' };
      }
      if (!args.category || !['Backend', 'Frontend', 'DevOps', 'Health', 'Finance', 'Mobile'].includes(args.category)) {
        return { valid: false, error: 'Valid category is required' };
      }
      break;

    case 'search_incidents':
      if (!args.query || args.query.length > 500) {
        return { valid: false, error: 'Query is required and must be less than 500 characters' };
      }
      if (args.limit && (args.limit < 1 || args.limit > 100)) {
        return { valid: false, error: 'Limit must be between 1 and 100' };
      }
      break;

    case 'add_solution':
      if (!args.incident_id || !args.solution_title || !args.solution_description || !args.steps) {
        return { valid: false, error: 'Missing required fields for solution' };
      }
      break;

    case 'get_similar_incidents':
      if (!args.incident_id) {
        return { valid: false, error: 'Incident ID is required' };
      }
      if (args.limit && (args.limit < 1 || args.limit > 20)) {
        return { valid: false, error: 'Limit must be between 1 and 20' };
      }
      break;
  }

  return { valid: true };
}

export function registerTools(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const endTimer = startTimer('list_tools');
    logger.info('Tools list requested', { toolCount: TOOL_DEFINITIONS.length });

    try {
      const result = { tools: TOOL_SUMMARIES } as any;
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      logger.error('Failed to list tools', error instanceof Error ? error : String(error));
      throw error;
    }
  });

  // Handle tool calls with optimizations
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const clientId = getClientId(request);
    const requestId = `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Rate limiting
    if (!checkRateLimit(clientId)) {
      logger.warn('Rate limit exceeded', { clientId, tool: name });
      return {
        content: [
          {
            type: 'text',
            text: 'Rate limit exceeded. Please try again later.'
          }
        ],
        isError: true
      };
    }

    // Start performance monitoring
    performanceMonitor.startRequest(requestId, name);
    const endTimer = startTimer(name, requestId);

    logger.info('Tool called', { tool: name, args, clientId, requestId });

    try {
      // Pre-validation
      const validation = preValidateToolCall(name, args);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check cache for read operations
      let result;
      if (['search_incidents', 'get_similar_incidents', 'export_knowledge'].includes(name)) {
        const cacheKey = JSON.stringify({ name, args });
        const cached = responseCache.getCachedSearchResults(cacheKey, {});
        if (cached) {
          logger.debug('Tool result from cache', { tool: name, requestId });
          result = cached;
        }
      }

      if (!result) {
        // Execute the tool handler
        switch (name) {
          case 'create_incident':
            result = await handleCreateIncident(args);
            break;
          case 'search_incidents':
            result = await handleSearchIncidents(args);
            // Cache search results
            const searchKey = JSON.stringify({ name, args });
            responseCache.cacheSearchResults(searchKey, {}, result);
            break;
          case 'add_solution':
            result = await handleAddSolution(args);
            // Invalidate relevant caches
            responseCache.invalidateIncident(args.incident_id);
            break;
          case 'extract_lessons':
            result = await handleExtractLessons(args);
            // Invalidate relevant caches
            responseCache.invalidateIncident(args.incident_id);
            break;
          case 'get_similar_incidents':
            result = await handleGetSimilarIncidents(args);
            // Cache similar incidents
            responseCache.cacheSimilarIncidents(args.incident_id, result);
            break;
          case 'update_incident_status':
            result = await handleUpdateIncidentStatus(args);
            // Invalidate relevant caches
            responseCache.invalidateIncident(args.incident_id);
            break;
          case 'export_knowledge':
            result = await handleExportKnowledge(args);
            // Cache export data
            const exportKey = JSON.stringify({ name, args });
            responseCache.cacheExportData(args.format || 'json', args.filter || {}, result);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      }

      endTimer();
      performanceMonitor.endRequest(requestId, true);

      logger.info('Tool completed successfully', { tool: name, requestId });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      endTimer();
      performanceMonitor.endRequest(requestId, false, message);

      logger.error('Tool execution failed', message, { tool: name, args, clientId, requestId });

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${message}`
          }
        ],
        isError: true
      };
    }
  });
}