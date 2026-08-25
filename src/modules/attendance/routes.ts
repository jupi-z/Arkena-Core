import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/middleware/validation.js';
import { listQuerySchema } from '../../common/http/query.js';
import { attendanceListQuerySchema, attendanceSchema, updateAttendanceSchema } from './types.js';
import { AttendanceController } from './controller.js';

export const attendanceRoutes = Router();
const controller = new AttendanceController();
const zSummaryQuerySchema = listQuerySchema.extend({
  departmentId: attendanceListQuerySchema.shape.departmentId.optional(),
  employeeId: attendanceListQuerySchema.shape.employeeId.optional(),
  from: attendanceListQuerySchema.shape.from.optional(),
  to: attendanceListQuerySchema.shape.to.optional()
});

attendanceRoutes.use(authenticate);
attendanceRoutes.get('/', requirePermissions('attendance:read'), validateRequest({ query: attendanceListQuerySchema }), asyncHandler(controller.list));
attendanceRoutes.get('/summary', requirePermissions('attendance:summary'), validateRequest({ query: zSummaryQuerySchema }), asyncHandler(controller.summary));
attendanceRoutes.get('/:id', requirePermissions('attendance:read'), asyncHandler(controller.getById));
attendanceRoutes.post('/', requirePermissions('attendance:create'), validateRequest({ body: attendanceSchema }), asyncHandler(controller.create));
attendanceRoutes.patch('/:id', requirePermissions('attendance:update'), validateRequest({ body: updateAttendanceSchema }), asyncHandler(controller.update));
attendanceRoutes.delete('/:id', requirePermissions('attendance:delete'), asyncHandler(controller.remove));
