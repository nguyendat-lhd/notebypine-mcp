import { Router, Response } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { validateRequest, validateQuery, schemas } from '../middleware/validation.js';
import { RateLimitMiddleware } from '../middleware/rateLimiter.js';
import { ErrorHandler, AppException } from '../middleware/errorHandler.js';

const router = Router();

// Get all incidents with pagination and filtering
router.get(
  '/',
  validateQuery(schemas.pagination),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query as any;
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    try {
      const result = await dbService.getIncidents('', page, limit);

      res.json({
        success: true,
        data: {
          items: result.items,
          total: result.totalItems
        }
      });
    } catch (error) {
      throw new AppException('Failed to fetch incidents', 500);
    }
  })
);

// Get specific incident
router.get(
  '/:id',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    try {
      const incident = await dbService.getClient().collection('incidents').getOne(id);
      res.json({
        success: true,
        data: incident
      });
    } catch (error) {
      throw new AppException('Incident not found', 404);
    }
  })
);

// Create new incident
router.post(
  '/',
  RateLimitMiddleware.general,
  validateRequest(schemas.incident),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    const incidentData = {
      ...req.body,
      createdBy: req.user?.id,
      created: new Date().toISOString()
    };

    const incident = await dbService.createIncident(incidentData);

    // Emit WebSocket event for real-time updates
    const wsServer = req.app.locals.wsServer;
    if (wsServer) {
      wsServer.broadcast({
        type: 'incident_created',
        data: incident
      });
    }

    res.status(201).json({
      success: true,
      data: incident
    });
  })
);

// Update incident
router.put(
  '/:id',
  validateRequest(schemas.incident),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    const updateData = {
      ...req.body,
      updated: new Date().toISOString(),
      updatedBy: req.user?.id
    };

    try {
      const incident = await dbService.updateIncident(id, updateData);

      // Emit WebSocket event
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'incident_updated',
          data: incident
        });
      }

      res.json({
        success: true,
        data: incident
      });
    } catch (error) {
      throw new AppException('Incident not found or update failed', 404);
    }
  })
);

// Delete incident
router.delete(
  '/:id',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    try {
      await dbService.deleteIncident(id);

      // Emit WebSocket event
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'incident_deleted',
          data: { id }
        });
      }

      res.json({
        success: true,
        message: 'Incident deleted successfully'
      });
    } catch (error) {
      throw new AppException('Incident not found or deletion failed', 404);
    }
  })
);

// Get incident statistics
router.get(
  '/stats/summary',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    try {
      const stats = await dbService.getStats();

      // Get additional incident-specific stats
      let recentIncidents: any[] = [];
      let highSeverityIncidents: any[] = [];

      try {
        const recent = await dbService.getIncidents('', 1, 10);
        recentIncidents = recent.items || [];
      } catch (error) {
        console.warn('Failed to fetch recent incidents:', error);
      }

      try {
        const highSeverity = await dbService.getIncidents('severity = "high" || severity = "critical"', 1, 5);
        highSeverityIncidents = highSeverity.items || [];
      } catch (error) {
        console.warn('Failed to fetch high severity incidents:', error);
      }

      res.json({
        success: true,
        data: {
          incidents: stats.incidents || 0,
          solutions: stats.solutions || 0,
          knowledgeBase: stats.knowledgeBase || 0,
          recent: recentIncidents,
          highSeverity: highSeverityIncidents
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch incident statistics:', error);
      throw new AppException(`Failed to fetch incident statistics: ${error.message || 'Unknown error'}`, 500);
    }
  })
);

export { router as incidentRoutes };