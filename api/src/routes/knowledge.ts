import { Router } from 'express';
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

    try {
      // Check if database is available
      if (dbService && await dbService.testConnection()) {
        const result = await dbService.getKnowledgeItems('', page, limit);

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
        const { mockKnowledge } = await import('../config/mockData.js');
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedKnowledge = mockKnowledge.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: paginatedKnowledge,
          pagination: {
            page: pageNum,
            perPage: limitNum,
            totalItems: mockKnowledge.length,
            totalPages: Math.ceil(mockKnowledge.length / limitNum)
          }
        });
      }
    } catch (error) {
      // Fallback to mock data on any error
      try {
        const { mockKnowledge } = await import('../config/mockData.js');
        const pageNum = parseInt(page.toString());
        const limitNum = parseInt(limit.toString());
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedKnowledge = mockKnowledge.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: paginatedKnowledge,
          pagination: {
            page: pageNum,
            perPage: limitNum,
            totalItems: mockKnowledge.length,
            totalPages: Math.ceil(mockKnowledge.length / limitNum)
          }
        });
      } catch (mockError) {
        throw new AppException('Failed to fetch knowledge items', 500);
      }
    }
  })
);

// Get specific knowledge item
router.get(
  '/:id',
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const dbService = req.app.locals.dbService;

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