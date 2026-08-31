import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { Prisma } from '@prisma/client';
import { corsOrigins, docsEnabled, env } from './config/env.js';
import { httpLogger } from './common/logger/logger.js';
import { errorHandler } from './common/errors/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { requestContext } from './common/middleware/request-context.js';
import { logger } from './common/logger/logger.js';
import { prisma } from './database/prisma.js';
import { getStartedAt, isShuttingDown } from './common/runtime/state.js';
import { authRoutes } from './modules/auth/index.js';
import { usersRoutes } from './modules/users/index.js';
import { departmentsRoutes } from './modules/departments/index.js';
import { employeesRoutes } from './modules/employees/index.js';
import { attendanceRoutes } from './modules/attendance/index.js';
import { documentsRoutes } from './modules/documents/index.js';
import { notificationsRoutes } from './modules/notifications/index.js';
import { auditRoutes } from './modules/audit/index.js';
import { dashboardRoutes } from './modules/dashboard/index.js';
import { openApiSpec } from './docs/openapi.js';

function parseTrustProxyValue(value: string): boolean | number | string {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }
  return value;
}

async function checkDatabaseReadiness(): Promise<{ ok: boolean; error?: string }> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database readiness check timed out')), env.READINESS_DB_TIMEOUT_MS);
      })
    ]);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Prisma.PrismaClientKnownRequestError ? error.message : 'Database unavailable';
    return { ok: false, error: message };
  }
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', parseTrustProxyValue(env.TRUST_PROXY));

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' }
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked'));
    },
    credentials: true
  }));
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false
  }));
  app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
  app.use(express.urlencoded({ extended: true }));
  app.use(httpLogger);
  app.use(requestContext);

  app.get('/health/live', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: isShuttingDown() ? 'shutting_down' : 'ok',
        service: env.SERVICE_NAME,
        version: env.SERVICE_VERSION,
        environment: env.NODE_ENV,
        uptimeSeconds: Math.floor((Date.now() - getStartedAt().getTime()) / 1000)
      }
    });
  });

  app.get('/health/ready', async (_req, res) => {
    if (isShuttingDown()) {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service is shutting down'
        }
      });
      return;
    }

    const db = await checkDatabaseReadiness();
    const ready = db.ok;
    res.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        status: ready ? 'ready' : 'degraded',
        service: env.SERVICE_NAME,
        version: env.SERVICE_VERSION,
        environment: env.NODE_ENV,
        uptimeSeconds: Math.floor((Date.now() - getStartedAt().getTime()) / 1000),
        dependencies: {
          database: db.ok ? 'up' : 'down'
        }
      },
      ...(db.ok ? {} : { error: { code: 'READINESS_FAILED', message: db.error ?? 'Readiness check failed' } })
    });
  });

  app.get('/health', async (_req, res) => {
    const db = await checkDatabaseReadiness();
    const ready = db.ok && !isShuttingDown();

    res.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        status: ready ? 'ok' : 'degraded',
        service: env.SERVICE_NAME,
        version: env.SERVICE_VERSION,
        environment: env.NODE_ENV,
        uptimeSeconds: Math.floor((Date.now() - getStartedAt().getTime()) / 1000),
        dependencies: {
          database: db.ok ? 'up' : 'down'
        }
      }
    });
  });

  if (docsEnabled) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
  } else {
    logger.warn('OpenAPI documentation is disabled by configuration');
  }

  app.use('/auth', authRoutes);
  app.use('/users', usersRoutes);
  app.use('/departments', departmentsRoutes);
  app.use('/employees', employeesRoutes);
  app.use('/attendance', attendanceRoutes);
  app.use('/documents', documentsRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/audit', auditRoutes);
  app.use('/dashboard', dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
