import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE')
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional()
});

export const assignRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'])
});
