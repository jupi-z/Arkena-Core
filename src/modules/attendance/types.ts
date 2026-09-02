import { z } from 'zod';
import { listQuerySchema } from '../../common/http/query.js';

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a calendar date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return date.toISOString().slice(0, 10) === value;
  }, 'Expected a valid calendar date');

const attendanceFields = {
  employeeId: z.string().min(1),
  departmentId: z.string().optional().nullable(),
  attendanceDay: dateOnlySchema,
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']),
  checkInAt: z.string().datetime().optional().nullable(),
  checkOutAt: z.string().datetime().optional().nullable(),
  comment: z.string().optional().nullable(),
  source: z.string().optional().nullable()
};

function validateCheckTimes(
  value: { checkInAt?: string | null; checkOutAt?: string | null },
  context: z.RefinementCtx
) {
  if (value.checkInAt && value.checkOutAt && new Date(value.checkOutAt) < new Date(value.checkInAt)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['checkOutAt'],
      message: 'Check-out must be on or after check-in'
    });
  }
}

export const attendanceSchema = z.object(attendanceFields).superRefine(validateCheckTimes);

export const updateAttendanceSchema = z
  .object(attendanceFields)
  .partial()
  .omit({ employeeId: true })
  .superRefine(validateCheckTimes);

export const attendanceListQuerySchema = listQuerySchema.extend({
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional()
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type AttendanceUpdateInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;

export function parseAttendanceDay(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error('Invalid attendance day');
  }
  return parsed;
}
