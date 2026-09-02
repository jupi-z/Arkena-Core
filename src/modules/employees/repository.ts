import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { publicUserSelect } from '../../common/security/public-user-select.js';

export class EmployeesRepository {
  listEmployees(where: Prisma.EmployeeWhereInput, skip: number, take: number, orderBy: Prisma.EmployeeOrderByWithRelationInput) {
    return prisma.employee.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        department: true,
        manager: true,
        user: {
          select: publicUserSelect
        },
        _count: {
          select: {
            attendance: true,
            documents: true,
            directReports: true
          }
        }
      }
    });
  }

  countEmployees(where: Prisma.EmployeeWhereInput) {
    return prisma.employee.count({ where });
  }

  findById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: true,
        user: {
          select: publicUserSelect
        },
        attendance: true,
        documents: true
      }
    });
  }

  findByEmail(email: string) {
    return prisma.employee.findUnique({ where: { email } });
  }

  create(data: Prisma.EmployeeCreateInput) {
    return prisma.employee.create({ data });
  }

  update(id: string, data: Prisma.EmployeeUpdateInput) {
    return prisma.employee.update({ where: { id }, data });
  }

  archive(id: string, archivedAt: Date) {
    return prisma.employee.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt
      }
    });
  }
}
