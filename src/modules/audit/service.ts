import { Prisma } from '@prisma/client';
import { offsetFromPage } from '../../common/http/query.js';
import { AuditRepository } from './repository.js';

export class AuditService {
  constructor(private readonly repository = new AuditRepository()) {}

  async list(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc'; resource?: string; action?: string }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.resource) where.resource = query.resource;
    if (query.action) where.action = query.action as any;
    if (query.search) {
      where.OR = [
        { resource: { contains: query.search, mode: 'insensitive' } },
        { resourceId: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const sortBy = query.sortBy && ['createdAt', 'action', 'resource'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const [items, total] = await Promise.all([
      this.repository.listAuditLogs(where, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.AuditLogOrderByWithRelationInput),
      this.repository.countAuditLogs(where)
    ]);

    return { items, total };
  }

  record(data: {
    actorUserId?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'REFRESH_TOKEN' | 'RESET_PASSWORD' | 'UPLOAD' | 'DOWNLOAD' | 'ASSIGN';
    resource: string;
    resourceId?: string;
    ip?: string;
    userAgent?: string;
    beforeData?: unknown;
    afterData?: unknown;
    metadata?: unknown;
  }) {
    return this.repository.create({
      actorUser: data.actorUserId ? { connect: { id: data.actorUserId } } : undefined,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      ip: data.ip,
      userAgent: data.userAgent,
      beforeData: data.beforeData as Prisma.InputJsonValue | undefined,
      afterData: data.afterData as Prisma.InputJsonValue | undefined,
      metadata: data.metadata as Prisma.InputJsonValue | undefined
    });
  }
}
