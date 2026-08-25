import { z } from 'zod';

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export function offsetFromPage(page: number, limit: number): number {
  return (page - 1) * limit;
}
