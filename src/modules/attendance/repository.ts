import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class AttendanceRepository {
  listAttendance(where: Prisma.AttendanceRecordWhereInput, skip: number, take: number, orderBy: Prisma.AttendanceRecordOrderByWithRelationInput) {
    return prisma.attendanceRecord.findMany({
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
        department: true,
        recordedByUser: true
      }
    });
  }

  countAttendance(where: Prisma.AttendanceRecordWhereInput) {
    return prisma.attendanceRecord.count({ where });
  }

  findById(id: string) {
    return prisma.attendanceRecord.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true
          }
        },
        department: true,
        recordedByUser: true
      }
    });
  }

  findByUnique(employeeId: string, attendanceDate: Date) {
    return prisma.attendanceRecord.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId,
          attendanceDate
        }
      }
    });
  }

  create(data: Prisma.AttendanceRecordCreateInput) {
    return prisma.attendanceRecord.create({ data });
  }

  update(id: string, data: Prisma.AttendanceRecordUpdateInput) {
    return prisma.attendanceRecord.update({ where: { id }, data });
  }

  remove(id: string) {
    return prisma.attendanceRecord.delete({ where: { id } });
  }

  summary(where: Prisma.AttendanceRecordWhereInput) {
    return Promise.all([
      prisma.attendanceRecord.count({ where: { ...where, status: 'PRESENT' } }),
      prisma.attendanceRecord.count({ where: { ...where, status: 'ABSENT' } }),
      prisma.attendanceRecord.count({ where: { ...where, status: 'LATE' } }),
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.groupBy({
        by: ['departmentId', 'status'],
        where,
        _count: {
          _all: true
        }
      })
    ]);
  }
}
