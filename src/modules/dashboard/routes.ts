import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { DashboardController } from './controller.js';

export const dashboardRoutes = Router();
const controller = new DashboardController();

dashboardRoutes.use(authenticate);
dashboardRoutes.get('/overview', requirePermissions('dashboard:read'), asyncHandler(controller.overview));
dashboardRoutes.get('/employees', requirePermissions('dashboard:read'), asyncHandler(controller.employees));
dashboardRoutes.get('/attendance', requirePermissions('dashboard:read'), asyncHandler(controller.attendance));
