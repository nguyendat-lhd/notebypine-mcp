import { Router } from 'express';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { validateQuery, schemas } from '../middleware/validation.js';
import { ErrorHandler } from '../middleware/errorHandler.js';

const router = Router();

// Global search across all content types
router.get(
  '/',
  validateQuery(schemas.search),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q, type = 'all', page = 1, limit = 20 } = req.query as any;
    const dbService = req.app.locals.dbService;

    const searchPromises: Promise<any>[] = [];
    const results: any = {
      query: q,
      type,
      page,
      limit,
      results: {},
      total: 0
    };

    // Search based on type
    if (type === 'incidents' || type === 'all') {
      searchPromises.push(
        dbService.searchIncidents(q).then(incidents => {
          results.results.incidents = incidents;
          results.total += incidents.length;
        })
      );
    }

    if (type === 'solutions' || type === 'all') {
      searchPromises.push(
        dbService.searchSolutions(q).then(solutions => {
          results.results.solutions = solutions;
          results.total += solutions.length;
        })
      );
    }

    if (type === 'knowledge' || type === 'all') {
      searchPromises.push(
        dbService.searchKnowledge(q).then(knowledge => {
          results.results.knowledge = knowledge;
          results.total += knowledge.length;
        })
      );
    }

    await Promise.all(searchPromises);

    res.json({
      success: true,
      data: results
    });
  })
);

// Search incidents only
router.get(
  '/incidents',
  validateQuery(schemas.search),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q, page = 1, limit = 20 } = req.query as any;
    const dbService = req.app.locals.dbService;

    const incidents = await dbService.searchIncidents(q);

    res.json({
      success: true,
      data: {
        query: q,
        results: incidents,
        total: incidents.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  })
);

// Search solutions only
router.get(
  '/solutions',
  validateQuery(schemas.search),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q, page = 1, limit = 20 } = req.query as any;
    const dbService = req.app.locals.dbService;

    const solutions = await dbService.searchSolutions(q);

    res.json({
      success: true,
      data: {
        query: q,
        results: solutions,
        total: solutions.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  })
);

// Search knowledge base only
router.get(
  '/knowledge',
  validateQuery(schemas.search),
  ErrorHandler.asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q, page = 1, limit = 50 } = req.query as any;
    const dbService = req.app.locals.dbService;

    const knowledge = await dbService.searchKnowledge(q);

    res.json({
      success: true,
      data: {
        query: q,
        results: knowledge,
        total: knowledge.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  })
);

export { router as searchRoutes };