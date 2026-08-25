import { z } from 'zod';

export const documentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  employeeId: z.string().optional(),
  type: z.enum(['CONTRACT', 'ID_CARD', 'ATTESTATION', 'CV', 'OTHER']).optional()
});

export const documentMetadataSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(['CONTRACT', 'ID_CARD', 'ATTESTATION', 'CV', 'OTHER']),
  title: z.string().min(1),
  description: z.string().optional().nullable()
});
