import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/validation/index.js';
import { archiveEmployeeSchema, employeeListQuerySchema, employeeSchema, updateEmployeeSchema } from './types.js';
import { EmployeesController } from './controller.js';

export const employeesRoutes = Router();
const controller = new EmployeesController();

employeesRoutes.use(authenticate);
employeesRoutes.get('/', requirePermissions('employee:read'), validateRequest({ query: employeeListQuerySchema }), asyncHandler(controller.list));
employeesRoutes.get('/:id', requirePermissions('employee:read'), asyncHandler(controller.getById));
employeesRoutes.post('/', requirePermissions('employee:create'), validateRequest({ body: employeeSchema }), asyncHandler(controller.create));
employeesRoutes.patch('/:id', requirePermissions('employee:update'), validateRequest({ body: updateEmployeeSchema }), asyncHandler(controller.update));
employeesRoutes.post('/:id/archive', requirePermissions('employee:archive'), validateRequest({ body: archiveEmployeeSchema }), asyncHandler(controller.archive));
