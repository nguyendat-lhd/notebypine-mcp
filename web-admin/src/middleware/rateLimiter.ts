import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';

export class RateLimitMiddleware {
  private static generalLimiter = new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip || 'anonymous',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
  });

  private static authLimiter = new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip || 'anonymous',
    points: 5, // Number of requests
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  });

  private static uploadLimiter = new RateLimiterMemory({
    keyGenerator: (req: Request) => req.ip || 'anonymous',
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds
  });

  static general = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.generalLimiter.consume(req.ip || 'anonymous');
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: secs
      });
    }
  };

  static auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.authLimiter.consume(req.ip || 'anonymous');
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        retryAfter: secs
      });
    }
  };

  static upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.uploadLimiter.consume(req.ip || 'anonymous');
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      res.status(429).json({
        success: false,
        error: 'Too many upload requests',
        retryAfter: secs
      });
    }
  };
}