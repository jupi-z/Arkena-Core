import { z } from 'zod';

export const employeeStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'ARCHIVED']);

export const employeeSchema = z.object({
  employeeNumber: z.string().min(2),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  hireDate: z.string().datetime(),
  status: employeeStatusSchema.default('ACTIVE'),
  departmentId: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export const updateEmployeeSchema = employeeSchema.partial().omit({ employeeNumber: true });

export const archiveEmployeeSchema = z.object({
  archivedAt: z.string().datetime().optional()
});
