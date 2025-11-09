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
      const baseUrl = client.baseUrl;

      // Try to authenticate as admin first using REST API
      try {
        const adminAuthResponse = await fetch(`${baseUrl}/api/admins/auth-with-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identity: email,
            password: password,
          }),
        });

        if (adminAuthResponse.ok) {
          const adminAuth = await adminAuthResponse.json();
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
        } else {
          const errorData = await adminAuthResponse.json().catch(() => ({}));
          throw { status: adminAuthResponse.status, message: errorData.message || adminAuthResponse.statusText };
        }
      } catch (adminError: any) {
        // Log admin auth error for debugging
        console.log(`Admin authentication failed for ${email}:`, adminError.status || adminError.message);
        
        // If admin auth fails, try regular user authentication with PocketBase
        try {
          const userAuthResponse = await fetch(`${baseUrl}/api/collections/users/auth-with-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identity: email,
              password: password,
            }),
          });

          if (userAuthResponse.ok) {
            const userAuth = await userAuthResponse.json();
            
            const token = jwt.sign(
              {
                id: userAuth.record.id,
                email: userAuth.record.email,
                role: userAuth.record.role || 'user'
              },
              this.jwtSecret,
              { expiresIn: '7d' }
            );

            return {
              success: true,
              data: {
                token,
                user: {
                  id: userAuth.record.id,
                  email: userAuth.record.email,
                  role: userAuth.record.role || 'user',
                  name: userAuth.record.name || userAuth.record.email
                }
              }
            };
          } else {
            const errorData = await userAuthResponse.json().catch(() => ({}));
            throw { status: userAuthResponse.status, message: errorData.message || userAuthResponse.statusText };
          }
        } catch (userError: any) {
          // Both admin and user authentication failed
          console.log(`User authentication also failed for ${email}:`, userError.status || userError.message);
          
          // Provide helpful error message
          if (adminError.status === 400 || adminError.status === 404) {
            throw new Error('Account not found. Please check your email or create an account.');
          } else if (adminError.status === 403) {
            throw new Error('Invalid password. Please check your credentials.');
          } else {
            throw new Error('Invalid credentials');
          }
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Invalid credentials'
      };
    }
  }
}