import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Prisma, RoleName } from '@prisma/client';
import { env } from '../../config/env.js';
import { forbidden, notFound, badRequest } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
import { offsetFromPage } from '../../common/http/query.js';
import { DocumentsRepository } from './repository.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const STORAGE_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

function hasValidFileSignature(mimeType: string, file: Buffer): boolean {
  if (mimeType === 'application/pdf') {
    return file.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  if (mimeType === 'image/jpeg') {
    return file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  return (
    mimeType === 'image/webp' &&
    file.length >= 12 &&
    file.subarray(0, 4).toString('ascii') === 'RIFF' &&
    file.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export class DocumentsService {
  constructor(private readonly repository = new DocumentsRepository()) {}

  private canAccess(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, document: { employeeId: string; departmentId?: string | null }) {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return true;
    }

    if (user.role === 'MANAGER') {
      return Boolean(user.departmentId && document.departmentId && user.departmentId === document.departmentId);
    }

    return user.employeeId === document.employeeId;
  }

  private applyScope(
    where: Prisma.DocumentWhereInput,
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }
  ): Prisma.DocumentWhereInput {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return where;
    }

    if (user.role === 'MANAGER') {
      return {
        AND: [
          where,
          {
            employee: {
              departmentId: user.departmentId ?? '__no_department__'
            }
          }
        ]
      };
    }

    return {
      AND: [
        where,
        {
          employeeId: user.employeeId ?? '__no_employee__'
        }
      ]
    };
  }

  async list(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc'; employeeId?: string; type?: string }) {
    const where: Prisma.DocumentWhereInput = {
      deletedAt: null
    };

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.type) where.type = query.type as any;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { originalName: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const sortBy = query.sortBy && ['createdAt', 'title', 'type'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const scopedWhere = this.applyScope(where, user);
    const [items, total] = await Promise.all([
      this.repository.listDocuments(scopedWhere, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.DocumentOrderByWithRelationInput),
      this.repository.countDocuments(scopedWhere)
    ]);

    return { items, total };
  }

  async getById(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string) {
    const document = await this.repository.findById(id);
    if (!document || document.deletedAt) {
      throw notFound('Document not found');
    }
    if (!this.canAccess(user, { employeeId: document.employeeId, departmentId: document.employee.departmentId })) {
      throw forbidden();
    }
    return document;
  }

  async upload(
    user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null },
    file: Express.Multer.File | undefined,
    metadata: { employeeId: string; type: 'CONTRACT' | 'ID_CARD' | 'ATTESTATION' | 'CV' | 'OTHER'; title: string; description?: string | null }
  ) {
    if (!file) {
      throw badRequest('File is required');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      await fs.unlink(file.path).catch(() => undefined);
      throw badRequest('Unsupported file type');
    }

    if (!this.canAccess(user, { employeeId: metadata.employeeId })) {
      await fs.unlink(file.path).catch(() => undefined);
      throw forbidden();
    }

    const fileBuffer = await fs.readFile(file.path);
    if (!hasValidFileSignature(file.mimetype, fileBuffer)) {
      await fs.unlink(file.path).catch(() => undefined);
      throw badRequest('File content does not match its declared type');
    }

    const ext = STORAGE_EXTENSIONS[file.mimetype];
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const finalPath = path.resolve(env.UPLOAD_DIR, storageKey);

    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.rename(file.path, finalPath);

    try {
      const checksum = crypto.createHash('sha256');
      checksum.update(fileBuffer);

      const created = await this.repository.create({
        employee: {
          connect: {
            id: metadata.employeeId
          }
        },
        uploadedByUser: {
          connect: {
            id: user.userId
          }
        },
        type: metadata.type,
        title: metadata.title,
        description: metadata.description,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeInBytes: file.size,
        storageKey,
        checksum: checksum.digest('hex'),
        accessLevel: 'PRIVATE'
      });

      void recordAudit({
        actorUserId: user.userId,
        action: 'UPLOAD',
        resource: 'document',
        resourceId: created.id,
        metadata: {
          type: metadata.type,
          storageKey: created.storageKey
        }
      });

      return created;
    } catch (error) {
      await fs.unlink(finalPath).catch(() => undefined);
      throw error;
    }
  }

  async download(user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string) {
    const document = await this.getById(user, id);

    const filePath = path.resolve(env.UPLOAD_DIR, document.storageKey);
    const file = await fs.readFile(filePath).catch(() => null);

    if (!file) {
      throw notFound('File not found');
    }

    return {
      document,
      file
    };
  }

  async remove(user: { userId: string; role: RoleName }, id: string) {
    const document = await this.getById(user, id);
    if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      throw forbidden();
    }

    const filePath = path.resolve(env.UPLOAD_DIR, document.storageKey);
    await fs.unlink(filePath).catch(() => undefined);
    const removed = await this.repository.update(id, {
      deletedAt: new Date()
    });

    void recordAudit({
      actorUserId: user.userId,
      action: 'DELETE',
      resource: 'document',
      resourceId: id
    });
    return removed;
  }
}
