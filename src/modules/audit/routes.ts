import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/validation/index.js';
import { auditListQuerySchema } from './types.js';
import { AuditController } from './controller.js';

export const auditRoutes = Router();
const controller = new AuditController();

auditRoutes.use(authenticate);
auditRoutes.get('/', requirePermissions('audit:read'), validateRequest({ query: auditListQuerySchema }), asyncHandler(controller.list));
