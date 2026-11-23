import { Prisma } from '@prisma/client';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { createSessionMiddleware } from './config/session';
import { csrfProtection } from './middleware/csrf';
import { alertsRouter } from './modules/alerts/alerts.routes';
import { ambulancesRouter } from './modules/ambulances/ambulances.routes';
import { authRouter } from './modules/auth/auth.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { doctorsRouter } from './modules/doctors/doctors.routes';
import { equipmentRouter } from './modules/equipment/equipment.routes';
import {
  auditLogsRouter,
  settingsRouter,
  usersRouter,
} from './modules/governance/governance.routes';
import { incidentsRouter } from './modules/incidents/incidents.routes';
import { medicinesRouter } from './modules/medicines/medicines.routes';
import { noticesRouter } from './modules/notices/notices.routes';
import { nursesRouter } from './modules/nurses/nurses.routes';
import { patientsRouter } from './modules/patients/patients.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { stationsRouter } from './modules/stations/stations.routes';
import { AppError } from './utils/AppError';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  // PostgreSQL-backed sessions (connect-pg-simple -> user_sessions) + CSRF protection
  app.use(createSessionMiddleware());
  app.use(csrfProtection);

  // Health Check
  app.get('/api/v1/health', async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        success: true,
        data: {
          status: 'ok',
          service: 'emrms-backend',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      res.status(503).json({
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Backend is running, but PostgreSQL is not reachable.',
        },
      });
    }
  });

  // Mount all domain API routers
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/incidents', incidentsRouter);
  app.use('/api/v1/patients', patientsRouter);
  app.use('/api/v1/notices', noticesRouter);
  app.use('/api/v1/alerts', alertsRouter);
  app.use('/api/v1/stations', stationsRouter);
  app.use('/api/v1/doctors', doctorsRouter);
  app.use('/api/v1/nurses', nursesRouter);
  app.use('/api/v1/medicines', medicinesRouter);
  app.use('/api/v1/equipment', equipmentRouter);
  app.use('/api/v1/ambulances', ambulancesRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/audit-logs', auditLogsRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/settings', settingsRouter);

  // 404 fallback
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, 'NOT_FOUND', 'Requested API endpoint does not exist.'));
  });

  // Centralized error handler (including clean Prisma constraint mapping)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT_DUPLICATE',
            message: 'A record with this unique identifier or active assignment already exists.',
            details: err.meta,
          },
        });
        return;
      }
      if (err.code === 'P2025') {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'The requested database record was not found.',
          },
        });
        return;
      }
      if (err.code === 'P2003') {
        res.status(409).json({
          success: false,
          error: {
            code: 'FOREIGN_KEY_CONFLICT',
            message: 'Operation blocked because this record is referenced by other records.',
          },
        });
        return;
      }
    }

    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
      },
    });
  });

  return app;
}
