import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

const publicActorSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true
} satisfies Prisma.UserSelect;

export class AuditRepository {
  listAuditLogs(where: Prisma.AuditLogWhereInput, skip: number, take: number, orderBy: Prisma.AuditLogOrderByWithRelationInput) {
    return prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        actorUser: {
          select: publicActorSelect
        }
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
