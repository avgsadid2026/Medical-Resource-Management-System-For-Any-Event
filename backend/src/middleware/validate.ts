import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid request payload.',
          parsed.error.flatten().fieldErrors
        )
      );
      return;
    }
    req.body = parsed.data;
    next();
  };
}
