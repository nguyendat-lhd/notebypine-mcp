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

const TOOLS: Tool[] = [
  {
    name: 'create_incident',
    description: 'Create a new incident record for troubleshooting. Returns incident ID and suggests similar incidents.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Brief title of the incident'
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
    description: 'Search existing incidents and solutions. Supports keyword search with filters.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - searches in title and description'
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
    description: 'Add a solution to an existing incident with step-by-step instructions.',
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
    description: 'Extract and document lessons learned from an incident.',
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
    description: 'Find similar incidents based on content similarity and category.',
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
    description: 'Update the status of an incident (open, investigating, resolved, archived).',
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
    description: 'Export knowledge base in various formats (JSON, CSV, Markdown).',
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

export function registerTools(server: Server) {
  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error(`=� Listing ${TOOLS.length} tools`);
    return { tools: TOOLS };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`=' Tool called: ${name}`, args);

    try {
      let result;
      switch (name) {
        case 'create_incident':
          result = await handleCreateIncident(args);
          break;
        case 'search_incidents':
          result = await handleSearchIncidents(args);
          break;
        case 'add_solution':
          result = await handleAddSolution(args);
          break;
        case 'extract_lessons':
          result = await handleExtractLessons(args);
          break;
        case 'get_similar_incidents':
          result = await handleGetSimilarIncidents(args);
          break;
        case 'update_incident_status':
          result = await handleUpdateIncidentStatus(args);
          break;
        case 'export_knowledge':
          result = await handleExportKnowledge(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      console.error(` Tool ${name} completed successfully`);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`L Tool ${name} failed: ${message}`);
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