import { Router } from 'express';
import { DatabaseService } from '../config/database.js';
import { ErrorHandler } from '../middleware/errorHandler.js';

const router = Router();

// Health check endpoint
router.get('/status', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService as DatabaseService;

    // Check if database service is available
    if (!dbService) {
      return res.status(503).json({
        success: false,
        error: 'Database service not available'
      });
    }

    // Check database connection
    const dbStatus = await dbService.testConnection();

    // Check memory usage
    const memUsage = process.memoryUsage();

    // Check uptime
    const uptime = process.uptime();

    const health = {
      status: dbStatus ? ('healthy' as const) : ('unhealthy' as const),
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
      },
      database: {
        connected: dbStatus,
        status: dbStatus ? 'connected' : 'disconnected'
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    if (!dbStatus) {
      return res.status(503).json({
        success: true,
        data: health
      });
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Detailed system information
router.get('/info', async (req, res) => {
  try {
    const dbService = req.app.locals.dbService as DatabaseService;
    const stats = await dbService.getStats();

    const info = {
      application: {
        name: 'NoteByPine Web Admin',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        process: {
          pid: process.pid,
          platform: process.platform,
          nodeVersion: process.version,
          arch: process.arch
        }
      },
      database: {
        type: 'PocketBase',
        url: process.env.POCKETBASE_URL,
        statistics: stats
      },
      system: {
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        resourceUsage: process.resourceUsage()
      },
      timestamp: new Date().toISOString()
    };

    res.json(info);
  } catch (error) {
    ErrorHandler.handle(error as Error, req, res, () => {});
  }
});

export { router as healthRoutes };