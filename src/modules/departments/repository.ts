import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class DepartmentsRepository {
  listDepartments(where: Prisma.DepartmentWhereInput, skip: number, take: number, orderBy: Prisma.DepartmentOrderByWithRelationInput) {
    return prisma.department.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        managerEmployee: true,
        _count: {
          select: {
            employees: true
          }
        }
      }
    });
  }

  countDepartments(where: Prisma.DepartmentWhereInput) {
    return prisma.department.count({ where });
  }

  findById(id: string) {
    return prisma.department.findUnique({
      where: { id },
      include: {
        managerEmployee: true,
        employees: true
      }
    });
  }

  create(data: Prisma.DepartmentCreateInput) {
    return prisma.department.create({ data });
  }

  update(id: string, data: Prisma.DepartmentUpdateInput) {
    return prisma.department.update({ where: { id }, data });
  }

  remove(id: string) {
    return prisma.department.delete({ where: { id } });
  }
}
