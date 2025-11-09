import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.query);

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  incident: Joi.object({
    title: Joi.string().required().min(3).max(200),
    description: Joi.string().required().min(10),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    status: Joi.string().valid('new', 'open', 'investigating', 'resolved', 'closed').default('new'),
    tags: Joi.array().items(Joi.string()).default([]),
    assignedTo: Joi.string().optional(),
    source: Joi.string().optional(),
    metadata: Joi.object().optional()
  }),

  // Schema for updating incidents - all fields optional except validation rules
  incidentUpdate: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(3).optional(), // Reduced from 10 to 3 for updates
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    status: Joi.string().valid('new', 'open', 'investigating', 'resolved', 'closed').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    assignedTo: Joi.string().optional(),
    assigned_to: Joi.string().optional(), // Support both camelCase and snake_case
    source: Joi.string().optional(),
    metadata: Joi.object().optional()
  }).min(1), // At least one field must be provided

  solution: Joi.object({
    title: Joi.string().required().min(3).max(200),
    description: Joi.string().required().min(10),
    steps: Joi.array().items(Joi.string()).required().min(1),
    category: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).default([]),
    verified: Joi.boolean().default(false),
    metadata: Joi.object().optional()
  }),

  knowledgeItem: Joi.object({
    title: Joi.string().required().min(3).max(200),
    content: Joi.string().required().min(10),
    category: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).default([]),
    type: Joi.string().valid('troubleshooting', 'procedures', 'documentation', 'reference').default('documentation'),
    verified: Joi.boolean().default(false),
    metadata: Joi.object().optional()
  }),

  search: Joi.object({
    q: Joi.string().required().min(1),
    type: Joi.string().valid('incidents', 'solutions', 'knowledge', 'all').default('all'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid('created', 'updated', 'title', 'severity').default('created'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(6)
  })
};