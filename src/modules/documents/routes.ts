import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { requirePermissions } from '../../common/middleware/rbac.js';
import { validateRequest } from '../../common/middleware/validation.js';
import { documentMetadataSchema, documentQuerySchema } from './types.js';
import { DocumentsController } from './controller.js';
import fs from 'node:fs';
import path from 'node:path';

const controller = new DocumentsController();
export const documentsRoutes = Router();

fs.mkdirSync(path.resolve(env.UPLOAD_DIR), { recursive: true });

const upload = multer({
  dest: path.resolve(env.UPLOAD_DIR, 'tmp'),
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  }
});

documentsRoutes.use(authenticate);
documentsRoutes.get('/', requirePermissions('document:read'), validateRequest({ query: documentQuerySchema }), asyncHandler(controller.list));
documentsRoutes.get('/:id', requirePermissions('document:read'), asyncHandler(controller.getById));
documentsRoutes.get('/:id/download', requirePermissions('document:download'), asyncHandler(controller.download));
documentsRoutes.post('/upload', requirePermissions('document:upload'), upload.single('file'), validateRequest({ body: documentMetadataSchema }), asyncHandler(controller.upload));
documentsRoutes.delete('/:id', requirePermissions('document:delete'), asyncHandler(controller.remove));
