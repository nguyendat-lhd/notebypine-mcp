import { Router } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { validateRequest, validateQuery, schemas } from '../middleware/validation.js';
import { ErrorHandler, AppException } from '../middleware/errorHandler.js';

const router = Router();

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

      res.json({
        success: true,
        data: {
          items: result.items,
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
        data: solution
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
      ...req.body,
      createdBy: req.user?.id,
      created: new Date().toISOString()
    };

    const solution = await dbService.createSolution(solutionData);

    // Emit WebSocket event
    const wsServer = req.app.locals.wsServer;
    if (wsServer) {
      wsServer.broadcast({
        type: 'solution_created',
        data: solution
      });
    }

    res.status(201).json({
      success: true,
      data: solution
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
      ...req.body,
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
          data: solution
        });
      }

      res.json({
        success: true,
        data: solution
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