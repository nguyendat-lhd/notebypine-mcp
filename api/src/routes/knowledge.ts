import { Router, Response } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { validateRequest, validateQuery, schemas } from '../middleware/validation.js';
import { ErrorHandler, AppException } from '../middleware/errorHandler.js';

const router = Router();

// Get all knowledge base items
router.get(
  '/',
  validateQuery(schemas.pagination),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 50 } = req.query as any;
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    try {
      const result = await dbService.getKnowledgeItems('', page, limit);

      res.json({
        success: true,
        data: {
          items: result.items,
          total: result.totalItems
        }
      });
    } catch (error: any) {
      console.error('Error fetching knowledge items:', error);
      const errorMessage = error?.message || error?.data?.message || 'Failed to fetch knowledge items';
      throw new AppException(errorMessage, 500);
    }
  })
);

// Get specific knowledge item
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
      const item = await dbService.getClient().collection('knowledge_base').getOne(id);
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      throw new AppException('Knowledge item not found', 404);
    }
  })
);

// Create new knowledge item
router.post(
  '/',
  validateRequest(schemas.knowledgeItem),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dbService = req.app.locals.dbService;

    // Check if database is available
    if (!dbService || !(await dbService.testConnection())) {
      return res.status(503).json({
        success: false,
        error: 'Database connection required. Please ensure PocketBase is running.'
      });
    }

    const itemData = {
      ...req.body,
      createdBy: req.user?.id,
      created: new Date().toISOString()
    };

    const item = await dbService.createKnowledgeItem(itemData);

    // Emit WebSocket event
    const wsServer = req.app.locals.wsServer;
    if (wsServer) {
      wsServer.broadcast({
        type: 'knowledge_created',
        data: item
      });
    }

    res.status(201).json({
      success: true,
      data: item
    });
  })
);

// Update knowledge item
router.put(
  '/:id',
  validateRequest(schemas.knowledgeItem),
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
      const item = await dbService.updateKnowledgeItem(id, updateData);

      // Emit WebSocket event
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'knowledge_updated',
          data: item
        });
      }

      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      throw new AppException('Knowledge item not found or update failed', 404);
    }
  })
);

// Delete knowledge item
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
      await dbService.deleteKnowledgeItem(id);

      // Emit WebSocket event
      const wsServer = req.app.locals.wsServer;
      if (wsServer) {
        wsServer.broadcast({
          type: 'knowledge_deleted',
          data: { id }
        });
      }

      res.json({
        success: true,
        message: 'Knowledge item deleted successfully'
      });
    } catch (error) {
      throw new AppException('Knowledge item not found or deletion failed', 404);
    }
  })
);

export { router as knowledgeRoutes };