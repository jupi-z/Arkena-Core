import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/middleware/validation.js';
import { listQuerySchema } from '../../common/http/query.js';
import { departmentSchema, updateDepartmentSchema } from './types.js';
import { DepartmentsController } from './controller.js';

export const departmentsRoutes = Router();
const controller = new DepartmentsController();

departmentsRoutes.use(authenticate);
departmentsRoutes.get('/', requirePermissions('department:read'), validateRequest({ query: listQuerySchema }), asyncHandler(controller.list));
departmentsRoutes.get('/:id', requirePermissions('department:read'), asyncHandler(controller.getById));
departmentsRoutes.post('/', requirePermissions('department:create'), validateRequest({ body: departmentSchema }), asyncHandler(controller.create));
departmentsRoutes.patch('/:id', requirePermissions('department:update'), validateRequest({ body: updateDepartmentSchema }), asyncHandler(controller.update));
departmentsRoutes.delete('/:id', requirePermissions('department:delete'), asyncHandler(controller.remove));
