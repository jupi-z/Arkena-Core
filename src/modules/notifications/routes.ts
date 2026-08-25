import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/middleware/validation.js';
import { listQuerySchema } from '../../common/http/query.js';
import { notificationSchema } from './types.js';
import { NotificationsController } from './controller.js';

export const notificationsRoutes = Router();
const controller = new NotificationsController();

notificationsRoutes.use(authenticate);
notificationsRoutes.get('/', requirePermissions('notification:read'), validateRequest({ query: listQuerySchema }), asyncHandler(controller.list));
notificationsRoutes.post('/', requirePermissions('notification:create'), validateRequest({ body: notificationSchema }), asyncHandler(controller.create));
notificationsRoutes.patch('/:id/read', requirePermissions('notification:read'), asyncHandler(controller.markRead));
