import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

/**
 * Generic validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error', { path: req.path, errors });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Query parameter validation
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Query validation error', { path: req.path, errors });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    req.query = value;
    next();
  };
};

// Validation schemas
export const schemas = {
  registerApp: Joi.object({
    app_name: Joi.string().min(3).max(255).required(),
    app_domain: Joi.string().uri().optional(),
  }),

  collectEvent: Joi.object({
    event: Joi.string().min(1).max(255).required(),
    url: Joi.string().uri().optional(),
    referrer: Joi.string().uri().optional(),
    device: Joi.string().valid('mobile', 'tablet', 'desktop').optional(),
    ipAddress: Joi.string().ip({ version: ['ipv4', 'ipv6'] }).optional(),
    timestamp: Joi.date().iso().optional(),
    metadata: Joi.object().optional(),
    user_id: Joi.string().max(255).optional(),
  }),

  eventSummaryQuery: Joi.object({
    event: Joi.string().min(1).max(255).required(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    app_id: Joi.string().uuid().optional(),
  }),

  userStatsQuery: Joi.object({
    userId: Joi.string().min(1).max(255).required(),
  }),
};
