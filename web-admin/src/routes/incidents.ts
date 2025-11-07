import { Router } from 'express';
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

    try {
      // Check if database is available
      if (dbService && await dbService.testConnection()) {
        const result = await dbService.getIncidents('', page, limit);

        res.json({
          success: true,
          data: result.items,
          pagination: {
            page: result.page,
            perPage: result.perPage,
            totalItems: result.totalItems,
            totalPages: result.totalPages
          }
        });
      } else {
        // Return mock data when database is not available
        const { mockIncidents } = await import('../config/mockData.js');
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedIncidents = mockIncidents.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: paginatedIncidents,
          pagination: {
            page: pageNum,
            perPage: limitNum,
            totalItems: mockIncidents.length,
            totalPages: Math.ceil(mockIncidents.length / limitNum)
          }
        });
      }
    } catch (error) {
      // Fallback to mock data on any error
      try {
        const { mockIncidents } = await import('../config/mockData.js');
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedIncidents = mockIncidents.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: paginatedIncidents,
          pagination: {
            page: pageNum,
            perPage: limitNum,
            totalItems: mockIncidents.length,
            totalPages: Math.ceil(mockIncidents.length / limitNum)
          }
        });
      } catch (mockError) {
        throw new AppException('Failed to fetch incidents', 500);
      }
    }
  })
);

// Get specific incident
router.get(
  '/:id',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

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

    try {
      // Check if database is available
      if (dbService && await dbService.testConnection()) {
        const stats = await dbService.getStats();

        // Get additional incident-specific stats
        const recentIncidents = await dbService.getIncidents('', 1, 10);
        const highSeverityIncidents = await dbService.getIncidents('severity = "high" || severity = "critical"', 1, 5);

        res.json({
          success: true,
          data: {
            total: stats.incidents,
            recent: recentIncidents.items,
            highSeverity: highSeverityIncidents.items
          }
        });
      } else {
        // Return mock data when database is not available
        const { mockStats } = await import('../config/mockData.js');
        res.json({
          success: true,
          data: mockStats
        });
      }
    } catch (error) {
      // Fallback to mock data on any error
      try {
        const { mockStats } = await import('../config/mockData.js');
        res.json({
          success: true,
          data: mockStats
        });
      } catch (mockError) {
        throw new AppException('Failed to fetch incident statistics', 500);
      }
    }
  })
);

export { router as incidentRoutes };