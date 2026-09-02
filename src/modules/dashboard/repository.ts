import dayjs from 'dayjs';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class DashboardRepository {
  overview(
    filters: {
      employeeWhere?: Prisma.EmployeeWhereInput;
      attendanceWhere?: Prisma.AttendanceRecordWhereInput;
      documentWhere?: Prisma.DocumentWhereInput;
      departmentWhere?: Prisma.DepartmentWhereInput;
    } = {}
  ) {
    const now = dayjs();
    const startOfToday = new Date(Date.UTC(now.year(), now.month(), now.date()));
    const employeeWhere = filters.employeeWhere ?? {};
    const attendanceWhere = filters.attendanceWhere ?? {};
    const documentWhere = filters.documentWhere ?? {};
    const departmentWhere = filters.departmentWhere ?? {};

    return Promise.all([
      prisma.employee.count({ where: employeeWhere }),
      prisma.employee.count({ where: { AND: [employeeWhere, { status: 'ACTIVE' }] } }),
      prisma.employee.count({
        where: { AND: [employeeWhere, { status: { in: ['INACTIVE', 'TERMINATED', 'ARCHIVED'] } }] }
      }),
      prisma.department.findMany({
        where: departmentWhere,
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              employees: true
            }
          }
        }
      }),
      prisma.attendanceRecord.count({ where: { AND: [attendanceWhere, { attendanceDay: { gte: startOfToday } }] } }),
      prisma.attendanceRecord.count({
        where: { AND: [attendanceWhere, { attendanceDay: { gte: startOfToday }, status: 'LATE' }] }
      }),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { AND: [documentWhere, { deletedAt: null }] },
        include: {
          employee: true
        }
      })
    ]);
  }

  employeeStats(
    filters: { employeeWhere?: Prisma.EmployeeWhereInput; departmentWhere?: Prisma.DepartmentWhereInput } = {}
  ) {
    const employeeWhere = filters.employeeWhere ?? {};
    const departmentWhere = filters.departmentWhere ?? {};

    return Promise.all([
      prisma.employee.groupBy({
        by: ['status'],
        where: employeeWhere,
        _count: { _all: true }
      }),
      prisma.department.findMany({
        where: departmentWhere,
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              employees: true
            }
          }
        }
      })
    ]);
  }

  attendanceStats(where: Prisma.AttendanceRecordWhereInput = {}) {
    return prisma.attendanceRecord.groupBy({
      by: ['status'],
      where,
      _count: { _all: true }
    });
  }
}
