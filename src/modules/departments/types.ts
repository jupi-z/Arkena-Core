import { z } from 'zod';

export const departmentSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  managerEmployeeId: z.string().optional().nullable()
});

export const updateDepartmentSchema = departmentSchema.partial().omit({ code: true });
