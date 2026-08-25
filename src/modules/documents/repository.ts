import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class DocumentsRepository {
  listDocuments(where: Prisma.DocumentWhereInput, skip: number, take: number, orderBy: Prisma.DocumentOrderByWithRelationInput) {
    return prisma.document.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        employee: {
          include: {
            department: true
          }
        },
        uploadedByUser: true
      }
    });
  }

  countDocuments(where: Prisma.DocumentWhereInput) {
    return prisma.document.count({ where });
  }

  findById(id: string) {
    return prisma.document.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            user: true
          }
        },
        uploadedByUser: true
      }
    });
  }

  create(data: Prisma.DocumentCreateInput) {
    return prisma.document.create({ data });
  }

  update(id: string, data: Prisma.DocumentUpdateInput) {
    return prisma.document.update({ where: { id }, data });
  }
}
