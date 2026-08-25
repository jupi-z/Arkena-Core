import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/middleware/validation.js';
import { listQuerySchema } from '../../common/http/query.js';
import { AuditController } from './controller.js';

export const auditRoutes = Router();
const controller = new AuditController();

auditRoutes.use(authenticate);
auditRoutes.get('/', requirePermissions('audit:read'), validateRequest({ query: listQuerySchema }), asyncHandler(controller.list));
