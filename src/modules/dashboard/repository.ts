import dayjs from 'dayjs';
import { prisma } from '../../database/prisma.js';

export class DashboardRepository {
  overview() {
    const startOfToday = dayjs().startOf('day').toDate();
    return Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.count({ where: { status: { in: ['INACTIVE', 'TERMINATED', 'ARCHIVED'] } } }),
      prisma.department.findMany({
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
      prisma.attendanceRecord.count({ where: { attendanceDate: { gte: startOfToday } } }),
      prisma.attendanceRecord.count({ where: { attendanceDate: { gte: startOfToday }, status: 'LATE' } }),
      prisma.document.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
        include: {
          employee: true
        }
      })
    ]);
  }

  employeeStats() {
    return Promise.all([
      prisma.employee.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.department.findMany({
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

  attendanceStats() {
    return prisma.attendanceRecord.groupBy({
      by: ['status'],
      _count: { _all: true }
    });
  }
}
