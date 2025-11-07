import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../config/database.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export class AuthMiddleware {
  private jwtSecret: string;

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
  }

  authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  };

  static createInstance(jwtSecret: string): AuthMiddleware {
    return new AuthMiddleware(jwtSecret);
  }

  authorize = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      next();
    };
  };

  async login(email: string, password: string, dbService: DatabaseService) {
    try {
      const client = dbService.getClient();

      // Try to authenticate as admin first
      try {
        const adminAuth = await client.admins.authWithPassword(email, password);
        const token = jwt.sign(
          {
            id: adminAuth.admin.id,
            email: adminAuth.admin.email,
            role: 'admin'
          },
          this.jwtSecret,
          { expiresIn: '7d' }
        );

        return {
          success: true,
          data: {
            token,
            user: {
              id: adminAuth.admin.id,
              email: adminAuth.admin.email,
              role: 'admin',
              name: 'Administrator'
            }
          }
        };
      } catch (adminError) {
        // If admin auth fails, try regular user authentication
        const user = await client.collection('users').getFirstListItem(`email = "${email}"`);

        if (!user) {
          throw new Error('User not found');
        }

        // In a real implementation, you would verify the password here
        // For PocketBase, this would involve using their auth methods
        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role || 'user'
          },
          this.jwtSecret,
          { expiresIn: '7d' }
        );

        return {
          success: true,
          data: {
            token,
            user: {
              id: user.id,
              email: user.email,
              role: user.role || 'user',
              name: user.name
            }
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Invalid credentials'
      };
    }
  }
}