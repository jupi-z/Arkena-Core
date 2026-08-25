import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { corsOrigins, env } from './config/env.js';
import { httpLogger } from './common/logger/logger.js';
import { errorHandler } from './common/errors/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { requestContext } from './common/middleware/request-context.js';
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

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
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
    windowMs: 15 * 60 * 1000,
    limit: 300
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(httpLogger);
  app.use(requestContext);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'Arkena Core',
        environment: env.NODE_ENV
      }
    });
  });

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
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
