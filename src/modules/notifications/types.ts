import { z } from 'zod';

export const notificationSchema = z.object({
  recipientUserId: z.string().min(1),
  type: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'SYSTEM']).default('INFO'),
  title: z.string().min(1),
  body: z.string().min(1),
  resourceType: z.string().optional().nullable(),
  resourceId: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional()
});
