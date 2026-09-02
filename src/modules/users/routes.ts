import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/validation/index.js';
import { assignRoleSchema, createUserSchema, updateUserSchema, userListQuerySchema } from './types.js';
import { UsersController } from './controller.js';

export const usersRoutes = Router();
const controller = new UsersController();

usersRoutes.use(authenticate);
usersRoutes.get('/', requirePermissions('user:read'), validateRequest({ query: userListQuerySchema }), asyncHandler(controller.list));
usersRoutes.post('/', requirePermissions('user:create'), validateRequest({ body: createUserSchema }), asyncHandler(controller.create));
usersRoutes.get('/:id', requirePermissions('user:read'), asyncHandler(controller.getById));
usersRoutes.patch('/:id', requirePermissions('user:update'), validateRequest({ body: updateUserSchema }), asyncHandler(controller.update));
usersRoutes.patch('/:id/role', requirePermissions('role:assign'), validateRequest({ body: assignRoleSchema }), asyncHandler(controller.assignRole));
usersRoutes.delete('/:id', requirePermissions('user:delete'), asyncHandler(controller.suspend));
