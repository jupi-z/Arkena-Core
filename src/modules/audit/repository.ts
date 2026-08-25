import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class AuditRepository {
  listAuditLogs(where: Prisma.AuditLogWhereInput, skip: number, take: number, orderBy: Prisma.AuditLogOrderByWithRelationInput) {
    return prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        actorUser: true
      }
    });
  }

  countAuditLogs(where: Prisma.AuditLogWhereInput) {
    return prisma.auditLog.count({ where });
  }

  create(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({ data });
  }
}
