import { Router, Request, Response } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { ErrorHandler, AppException } from '../middleware/errorHandler.js';

const router = Router();

// Chat endpoint for ChatOps functionality
router.post(
  '/message',
  (req, res, next) => {
    // Simple authentication middleware inline
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    next();
  },
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      throw new AppException('Message is required and must be a string', 400);
    }

    try {
      // Parse the user's message to determine intent
      const intent = parseIntent(message);
      let response;

      // Handle different ChatOps commands
      switch (intent.type) {
        case 'create_incident':
          response = await handleCreateIncident(intent.data, req.user, req.app.locals.dbService);
          break;
        case 'search_incidents':
          response = await handleSearchIncidents(intent.data, req.app.locals.dbService);
          break;
        case 'get_stats':
          response = await handleGetStats(req.app.locals.dbService);
          break;
        case 'create_solution':
          response = await handleCreateSolution(intent.data, req.user, req.app.locals.dbService);
          break;
        case 'search_knowledge':
          response = await handleSearchKnowledge(intent.data, req.app.locals.dbService);
          break;
        default:
          response = await handleGeneralQuery(message, context);
      }

      // Broadcast the chat message for real-time updates
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'chat_message',
          data: {
            user: req.user,
            message,
            response,
            timestamp: new Date().toISOString()
          }
        });
      }

      res.json({
        success: true,
        data: {
          message,
          response,
          intent: intent.type,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      throw new AppException('Failed to process chat message', 500);
    }
  })
);

// Get chat history
router.get(
  '/history',
  (req, res, next) => {
    // Simple authentication middleware inline
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    next();
  },
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would typically fetch from a chat history collection
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        history: [],
        message: 'Chat history feature coming soon'
      }
    });
  })
);

// Chat commands help
router.get(
  '/help',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const help = {
      success: true,
      data: {
        title: 'NoteByPine ChatOps Commands',
        commands: [
          {
            command: 'Create incident: [title] - [description]',
            description: 'Create a new incident',
            example: 'Create incident: Server down - The main web server is not responding'
          },
          {
            command: 'Search incidents: [query]',
            description: 'Search for incidents',
            example: 'Search incidents: server crash'
          },
          {
            command: 'Create solution: [title] - [steps]',
            description: 'Create a new solution',
            example: 'Create solution: Restart web server - 1. SSH to server 2. Run systemctl restart nginx'
          },
          {
            command: 'Search knowledge: [query]',
            description: 'Search knowledge base',
            example: 'Search knowledge: database backup'
          },
          {
            command: 'Get stats',
            description: 'Get system statistics',
            example: 'Get stats'
          }
        ],
        naturalLanguage: 'You can also chat naturally! Try: "Hey, can you help me create an incident about the database being slow?"'
      }
    };

    res.json(help);
  })
);

// Intent parsing function
function parseIntent(message: string) {
  const lowerMessage = message.toLowerCase().trim();

  // Create incident patterns
  if (lowerMessage.includes('create incident') || lowerMessage.includes('new incident') ||
      lowerMessage.includes('report incident') || lowerMessage.startsWith('incident:')) {
    const parts = message.split(/[-:]/, 2);
    return {
      type: 'create_incident',
      data: {
        title: parts[0]?.replace(/create incident:|incident:/i, '').trim() || 'Untitled Incident',
        description: parts[1]?.trim() || '',
        severity: 'medium'
      }
    };
  }

  // Search incidents patterns
  if (lowerMessage.includes('search incidents') || lowerMessage.includes('find incidents')) {
    const query = message.replace(/search incidents:|find incidents:/i, '').trim();
    return {
      type: 'search_incidents',
      data: { query }
    };
  }

  // Create solution patterns
  if (lowerMessage.includes('create solution') || lowerMessage.includes('new solution')) {
    const parts = message.split(/[-:]/, 2);
    return {
      type: 'create_solution',
      data: {
        title: parts[0]?.replace(/create solution:|solution:/i, '').trim() || 'Untitled Solution',
        description: parts[1]?.trim() || '',
        steps: parts[1]?.trim().split(/\d+\./).filter(s => s.trim()) || []
      }
    };
  }

  // Search knowledge patterns
  if (lowerMessage.includes('search knowledge') || lowerMessage.includes('find knowledge')) {
    const query = message.replace(/search knowledge:|find knowledge:/i, '').trim();
    return {
      type: 'search_knowledge',
      data: { query }
    };
  }

  // Stats patterns
  if (lowerMessage.includes('get stats') || lowerMessage.includes('statistics') ||
      lowerMessage.includes('dashboard') || lowerMessage.includes('status')) {
    return {
      type: 'get_stats',
      data: {}
    };
  }

  // Natural language processing for more complex queries
  if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
    return {
      type: 'help',
      data: {}
    };
  }

  return {
    type: 'general',
    data: { message }
  };
}

// Handler functions
async function handleCreateIncident(data: any, user: any, dbService: any) {
  try {
    const incident = await dbService.createIncident({
      title: data.title,
      description: data.description,
      severity: data.severity || 'medium',
      status: 'new',
      createdBy: user.id,
      created: new Date().toISOString()
    });

    return {
      type: 'incident_created',
      message: `✅ Incident "${data.title}" has been created successfully`,
      data: incident
    };
  } catch (error) {
    return {
      type: 'error',
      message: '❌ Failed to create incident. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function handleSearchIncidents(data: any, dbService: any) {
  try {
    const incidents = await dbService.searchIncidents(data.query);

    return {
      type: 'search_results',
      message: `Found ${incidents.length} incidents matching "${data.query}"`,
      data: incidents
    };
  } catch (error) {
    return {
      type: 'error',
      message: '❌ Failed to search incidents.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function handleGetStats(dbService: any) {
  try {
    const stats = await dbService.getStats();

    return {
      type: 'stats',
      message: '📊 Current System Statistics',
      data: stats
    };
  } catch (error) {
    return {
      type: 'error',
      message: '❌ Failed to retrieve statistics.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function handleCreateSolution(data: any, user: any, dbService: any) {
  try {
    const solution = await dbService.createSolution({
      title: data.title,
      description: data.description,
      steps: data.steps,
      category: 'troubleshooting',
      createdBy: user.id,
      created: new Date().toISOString()
    });

    return {
      type: 'solution_created',
      message: `✅ Solution "${data.title}" has been created successfully`,
      data: solution
    };
  } catch (error) {
    return {
      type: 'error',
      message: '❌ Failed to create solution. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function handleSearchKnowledge(data: any, dbService: any) {
  try {
    const knowledge = await dbService.searchKnowledge(data.query);

    return {
      type: 'search_results',
      message: `Found ${knowledge.length} knowledge items matching "${data.query}"`,
      data: knowledge
    };
  } catch (error) {
    return {
      type: 'error',
      message: '❌ Failed to search knowledge base.',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function handleGeneralQuery(message: string, context: any) {
  // Simple responses for general queries
  const responses = [
    "I'm here to help you manage incidents and solutions! Try asking me to create an incident or search for information.",
    "You can ask me to create incidents, search for solutions, or get system statistics. Type 'help' for more commands.",
    "I'm your NoteByPine assistant. What would you like to accomplish today?"
  ];

  return {
    type: 'general_response',
    message: responses[Math.floor(Math.random() * responses.length)],
    suggestions: [
      'Create incident: Server issue - The main server is running slow',
      'Search incidents: database',
      'Get stats',
      'Help'
    ]
  };
}

export { router as chatRoutes };