import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Prisma, RoleName } from '@prisma/client';
import { env } from '../../config/env.js';
import { forbidden, notFound, badRequest } from '../../common/errors/http-error.js';
import { offsetFromPage } from '../../common/http/query.js';
import { DocumentsRepository } from './repository.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export class DocumentsService {
  constructor(private readonly repository = new DocumentsRepository()) {}

  private canAccess(user: { id: string; role: RoleName; employeeId?: string | null; departmentId?: string | null }, document: { employeeId: string; departmentId?: string | null }) {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return true;
    }

    if (user.role === 'MANAGER') {
      return Boolean(user.departmentId && document.departmentId && user.departmentId === document.departmentId);
    }

    return user.employeeId === document.employeeId;
  }

  async list(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc'; employeeId?: string; type?: string }) {
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
    const [items, total] = await Promise.all([
      this.repository.listDocuments(where, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.DocumentOrderByWithRelationInput),
      this.repository.countDocuments(where)
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const document = await this.repository.findById(id);
    if (!document || document.deletedAt) {
      throw notFound('Document not found');
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

    if (!this.canAccess({ id: user.userId, role: user.role, employeeId: user.employeeId, departmentId: user.departmentId }, { employeeId: metadata.employeeId })) {
      await fs.unlink(file.path).catch(() => undefined);
      throw forbidden();
    }

    const ext = path.extname(file.originalname) || '.bin';
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const finalPath = path.resolve(env.UPLOAD_DIR, storageKey);

    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.rename(file.path, finalPath);

    const checksum = crypto.createHash('sha256');
    const fileBuffer = await fs.readFile(finalPath);
    checksum.update(fileBuffer);

    return this.repository.create({
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
  }

  async download(user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string) {
    const document = await this.getById(id);

    if (!this.canAccess({ id: user.userId, role: user.role, employeeId: user.employeeId, departmentId: user.departmentId }, { employeeId: document.employeeId, departmentId: document.employee.departmentId })) {
      throw forbidden();
    }

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
    const document = await this.getById(id);
    if (!['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      throw forbidden();
    }

    const filePath = path.resolve(env.UPLOAD_DIR, document.storageKey);
    await fs.unlink(filePath).catch(() => undefined);
    return this.repository.update(id, {
      deletedAt: new Date()
    });
  }
}
