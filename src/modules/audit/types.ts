import { z } from 'zod';
import { listQuerySchema } from '../../common/http/query.js';

export const auditListQuerySchema = listQuerySchema.extend({
  resource: z.string().trim().optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'REFRESH_TOKEN', 'RESET_PASSWORD', 'UPLOAD', 'DOWNLOAD', 'ASSIGN']).optional()
});
