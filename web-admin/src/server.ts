import express from 'express';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Import our modules
import { DatabaseService } from './config/database.js';
import { AuthMiddleware } from './middleware/auth.js';
import { ErrorHandler } from './middleware/errorHandler.js';
import { RateLimitMiddleware } from './middleware/rateLimiter.js';
import { setupWebSocket } from './services/websocket.js';

// Import routes
import { apiRoutes } from './routes/api.js';

// Load environment variables
dotenv.config();

class NoteByPineServer {
  private app: express.Application;
  private server: any;
  private dbService: DatabaseService;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);

    // Initialize services
    this.dbService = new DatabaseService({
      url: process.env.POCKETBASE_URL || 'http://127.0.0.1:8090',
      adminEmail: process.env.POCKETBASE_ADMIN_EMAIL || 'admin@example.com',
      adminPassword: process.env.POCKETBASE_ADMIN_PASSWORD || 'password'
    });

    this.authMiddleware = new AuthMiddleware(process.env.JWT_SECRET || 'default-secret');

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for development
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    const defaultOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080',
    ];

    const corsOrigins = [
      ...defaultOrigins,
      ...((process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)),
    ];

    const corsOptions: CorsOptions = {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }

        if (corsOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      optionsSuccessStatus: 200,
    };

    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(RateLimitMiddleware.general);

    // Make services available to routes
    this.app.locals.dbService = this.dbService;
    this.app.locals.authMiddleware = this.authMiddleware;

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Static files serving (serve the existing HTML)
    const staticPath = path.join(process.cwd(), '..', 'docs', 'html');
    if (fs.existsSync(staticPath)) {
      this.app.use(express.static(staticPath));
      console.log(`📁 Serving static files from: ${staticPath}`);
    } else {
      console.log(`⚠️  Static files directory not found: ${staticPath}`);
    }

    // API routes
    this.app.use('/', apiRoutes);

    // Default route for SPA (serve index.html)
    this.app.get('*', (req, res) => {
      const indexPath = path.join(staticPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({
          success: false,
          error: 'Page not found'
        });
      }
    });

    // Authentication endpoint with fallback for development
    this.app.post('/api/auth/login', RateLimitMiddleware.auth, async (req, res, next) => {
      try {
        const { email, password } = req.body;

        // Fallback authentication for development when PocketBase is not available
        let dbConnected = false;
        let dbAvailable = false;
        try {
          dbAvailable = !!this.dbService;
          if (dbAvailable) {
            // Check if PocketBase is actually available by trying health check
            const health = await this.dbService.getClient().health.check();
            dbConnected = health.code === 200;
          }
          console.log(`Database availability: ${dbAvailable}, connected: ${dbConnected}`);
        } catch (error) {
          console.log('Database connection test failed, using fallback auth:', error.message);
        }

        if (!dbConnected) {
          console.log('Using fallback authentication');
          // Simple hardcoded authentication for development
          if (email === 'admin@example.com' && password === 'admin123456') {
            console.log('Credentials match, generating token');
            const token = jwt.sign(
              {
                id: 'dev-admin-id',
                email: 'admin@example.com',
                role: 'admin'
              },
              process.env.JWT_SECRET || 'default-secret',
              { expiresIn: '7d' }
            );

            return res.json({
              success: true,
              data: {
                token,
                user: {
                  id: 'dev-admin-id',
                  email: 'admin@example.com',
                  role: 'admin',
                  name: 'Admin User'
                }
              }
            });
          } else {
            console.log('Invalid credentials provided');
            return res.status(401).json({
              success: false,
              error: 'Invalid credentials'
            });
          }
        }

        // Try PocketBase authentication if available
        const result = await this.authMiddleware.login(email, password, this.dbService);

        if (result.success) {
          res.json(result);
        } else {
          res.status(401).json(result);
        }
      } catch (error) {
        next(error);
      }
    });
  }

  private setupErrorHandling() {
    // 404 handler
    this.app.use(ErrorHandler.notFound);

    // Global error handler
    this.app.use(ErrorHandler.handle);
  }

  public async start() {
    try {
      // Initialize database connection
      console.log('🔌 Connecting to PocketBase with updated credentials...');

      // Skip authentication for now if PocketBase is not available
      try {
        await this.dbService.authenticate();
        const dbConnected = await this.dbService.testConnection();
        if (!dbConnected) {
          console.log('⚠️  PocketBase not available, continuing without database...');
        } else {
          console.log('✅ PocketBase connection established');
        }
      } catch (error) {
        console.log('⚠️  PocketBase authentication failed, continuing without database...');
        console.log('   Make sure PocketBase is running on http://localhost:8090');
      }

      // Setup WebSocket
      console.log('🌐 Setting up WebSocket server...');
      setupWebSocket(this.app, this.server);
      console.log('✅ WebSocket server ready - stable connection');

      // Start HTTP server
      const port = process.env.PORT || 3000;
      this.server.listen(port, () => {
        console.log(`🚀 NoteByPine Web Admin Server started successfully!`);
        console.log(`📍 Server running at: http://localhost:${port}`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 WebSocket endpoint: ws://localhost:${port}/ws`);
        console.log(`📁 Static files: http://localhost:${port}/index.html`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private async shutdown() {
    console.log('🛑 Shutting down server...');

    this.server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.log('❌ Forcing server shutdown');
      process.exit(1);
    }, 10000);
  }
}

// Start the server
const server = new NoteByPineServer();
server.start().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});

export default server;