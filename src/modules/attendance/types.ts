import { z } from 'zod';
import { listQuerySchema } from '../../common/http/query.js';

export const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  departmentId: z.string().optional().nullable(),
  attendanceDate: z.string().datetime(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']),
  checkInAt: z.string().datetime().optional().nullable(),
  checkOutAt: z.string().datetime().optional().nullable(),
  comment: z.string().optional().nullable(),
  source: z.string().optional().nullable()
});

export const updateAttendanceSchema = attendanceSchema.partial().omit({ employeeId: true });

export const attendanceListQuerySchema = listQuerySchema.extend({
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});
