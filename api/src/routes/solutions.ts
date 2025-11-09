import { Router, Response } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { validateRequest, validateQuery, schemas } from '../middleware/validation.js';
import { ErrorHandler, AppException } from '../middleware/errorHandler.js';

const router = Router();

// Helper function to transform PocketBase format to frontend format
const transformSolution = (item: any) => ({
  id: item.id,
  title: item.solution_title || item.title || '',
  description: item.solution_description || item.description || '',
  steps: item.steps || [],
  category: item.category || 'troubleshooting',
  tags: item.tags || [],
  verified: item.verified || false,
  incidentId: item.incident_id,
  incident_id: item.incident_id,
  created: item.created || item.created_at,
  updated: item.updated || item.updated_at,
  created_at: item.created || item.created_at,
  updated_at: item.updated || item.updated_at,
});

// Helper function to transform frontend format to PocketBase format
const transformToPocketBase = (data: any) => ({
  solution_title: data.title || data.solution_title,
  solution_description: data.description || data.solution_description,
  incident_id: data.incidentId || data.incident_id,
  steps: data.steps || [],
  category: data.category || 'troubleshooting',
  tags: data.tags || [],
  verified: data.verified || false,
});

// Get all solutions
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
      const result = await dbService.getSolutions('', page, limit);

      // Transform PocketBase format to frontend format
      const transformedItems = result.items.map(transformSolution);

      res.json({
        success: true,
        data: {
          items: transformedItems,
          total: result.totalItems
        }
      });
    } catch (error) {
      throw new AppException('Failed to fetch solutions', 500);
    }
  })
);

// Get specific solution
router.get(
  '/:id',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

    try {
      const solution = await dbService.getClient().collection('solutions').getOne(id);
      
      res.json({
        success: true,
        data: transformSolution(solution)
      });
    } catch (error) {
      throw new AppException('Solution not found', 404);
    }
  })
);

// Create new solution
router.post(
  '/',
  validateRequest(schemas.solution),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dbService = req.app.locals.dbService;
    const solutionData = {
      ...transformToPocketBase(req.body),
      createdBy: req.user?.id,
      created: new Date().toISOString()
    };

    const solution = await dbService.createSolution(solutionData);

    // Emit WebSocket event
    const wsServer = req.app.locals.wsServer;
    if (wsServer) {
      wsServer.broadcast({
        type: 'solution_created',
        data: transformSolution(solution)
      });
    }

    res.status(201).json({
      success: true,
      data: transformSolution(solution)
    });
  })
);

// Update solution
router.put(
  '/:id',
  validateRequest(schemas.solution),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;
    const updateData = {
      ...transformToPocketBase(req.body),
      updated: new Date().toISOString(),
      updatedBy: req.user?.id
    };

    try {
      const solution = await dbService.updateSolution(id, updateData);

      // Emit WebSocket event
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'solution_updated',
          data: transformSolution(solution)
        });
      }

      res.json({
        success: true,
        data: transformSolution(solution)
      });
    } catch (error) {
      throw new AppException('Solution not found or update failed', 404);
    }
  })
);

// Delete solution
router.delete(
  '/:id',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

    try {
      await dbService.deleteSolution(id);

      // Emit WebSocket event
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'solution_deleted',
          data: { id }
        });
      }

      res.json({
        success: true,
        message: 'Solution deleted successfully'
      });
    } catch (error) {
      throw new AppException('Solution not found or deletion failed', 404);
    }
  })
);

export { router as solutionRoutes };