import { AttendanceStatus, Prisma, RoleName } from '@prisma/client';
import { badRequest, conflict, forbidden, notFound } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
import { offsetFromPage } from '../../common/http/query.js';
import { AttendanceRepository } from './repository.js';
import { AttendanceInput, AttendanceListQuery, AttendanceUpdateInput, parseAttendanceDay } from './types.js';

export class AttendanceService {
  constructor(private readonly repository = new AttendanceRepository()) {}

  private applyScope(
    where: Prisma.AttendanceRecordWhereInput,
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }
  ): Prisma.AttendanceRecordWhereInput {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return where;
    }

    if (user.role === 'MANAGER') {
      return {
        AND: [
          where,
          {
            departmentId: user.departmentId ?? '__no_department__'
          }
        ]
      };
    }

    return {
      AND: [
        where,
        {
          employeeId: user.employeeId ?? '__no_employee__'
        }
      ]
    };
  }

  private canAccess(
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null },
    record: { employeeId: string; departmentId?: string | null }
  ): boolean {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return true;
    }

    if (user.role === 'MANAGER') {
      return Boolean(user.departmentId && record.departmentId && user.departmentId === record.departmentId);
    }

    return user.employeeId === record.employeeId;
  }

  async list(
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null },
    query: AttendanceListQuery
  ) {
    const where: Prisma.AttendanceRecordWhereInput = {};

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.attendanceDay = {} as Prisma.DateTimeFilter;
      if (query.from) where.attendanceDay.gte = parseAttendanceDay(query.from);
      if (query.to) where.attendanceDay.lte = parseAttendanceDay(query.to);
    }
    if (query.search) {
      where.employee = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { employeeNumber: { contains: query.search, mode: 'insensitive' } }
        ]
      };
    }

    const sortBy =
      query.sortBy && ['attendanceDay', 'createdAt', 'updatedAt'].includes(query.sortBy)
        ? query.sortBy
        : 'attendanceDay';
    const scopedWhere = this.applyScope(where, user);
    const [items, total] = await Promise.all([
      this.repository.listAttendance(scopedWhere, offsetFromPage(query.page, query.limit), query.limit, {
        [sortBy]: query.sortOrder
      } as Prisma.AttendanceRecordOrderByWithRelationInput),
      this.repository.countAttendance(scopedWhere)
    ]);

    return { items, total };
  }

  async getById(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string) {
    const record = await this.repository.findById(id);
    if (!record) {
      throw notFound('Attendance record not found');
    }
    if (!this.canAccess(user, record)) {
      throw forbidden();
    }
    return record;
  }

  async create(
    user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null },
    input: AttendanceInput
  ) {
    if (!this.canAccess(user, { employeeId: input.employeeId, departmentId: input.departmentId })) {
      throw forbidden();
    }

    const attendanceDay = parseAttendanceDay(input.attendanceDay);
    const checkInAt = input.checkInAt ? new Date(input.checkInAt) : null;
    const checkOutAt = input.checkOutAt ? new Date(input.checkOutAt) : null;
    this.assertCheckTimes(checkInAt, checkOutAt);
    const existing = await this.repository.findByUnique(input.employeeId, attendanceDay);
    if (existing) {
      throw conflict('Attendance record already exists for that employee and day');
    }

    let created: Awaited<ReturnType<AttendanceRepository['create']>>;
    try {
      created = await this.repository.create({
        employee: { connect: { id: input.employeeId } },
        department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
        attendanceDay,
        status: input.status,
        checkInAt,
        checkOutAt,
        comment: input.comment,
        source: input.source,
        recordedByUser: { connect: { id: user.userId } }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('Attendance record already exists for that employee and day');
      }
      throw error;
    }

    void recordAudit({
      actorUserId: user.userId,
      action: 'CREATE',
      resource: 'attendance',
      resourceId: created.id
    });

    return created;
  }

  async update(
    user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null },
    id: string,
    input: AttendanceUpdateInput
  ) {
    const record = await this.getById(user, id);
    const data: Prisma.AttendanceRecordUpdateInput = {};

    if (typeof input.departmentId === 'string') data.department = { connect: { id: input.departmentId } };
    if (input.departmentId === null) data.department = { disconnect: true };
    const attendanceDay = input.attendanceDay ? parseAttendanceDay(input.attendanceDay) : record.attendanceDay;
    const checkInAt =
      input.checkInAt === undefined ? record.checkInAt : input.checkInAt ? new Date(input.checkInAt) : null;
    const checkOutAt =
      input.checkOutAt === undefined ? record.checkOutAt : input.checkOutAt ? new Date(input.checkOutAt) : null;
    this.assertCheckTimes(checkInAt, checkOutAt);
    if (input.attendanceDay) {
      const existing = await this.repository.findByUnique(record.employeeId, attendanceDay, id);
      if (existing) {
        throw conflict('Attendance record already exists for that employee and day');
      }
      data.attendanceDay = attendanceDay;
    }
    if (input.status) data.status = input.status as AttendanceStatus;
    if (input.checkInAt !== undefined) data.checkInAt = checkInAt;
    if (input.checkOutAt !== undefined) data.checkOutAt = checkOutAt;
    if (input.comment !== undefined) data.comment = input.comment;
    if (input.source !== undefined) data.source = input.source;

    if (!record) {
      throw notFound('Attendance record not found');
    }

    let updated: Awaited<ReturnType<AttendanceRepository['update']>>;
    try {
      updated = await this.repository.update(id, data);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('Attendance record already exists for that employee and day');
      }
      throw error;
    }
    void recordAudit({
      actorUserId: user.userId,
      action: 'UPDATE',
      resource: 'attendance',
      resourceId: id,
      beforeData: record,
      afterData: updated
    });
    return updated;
  }

  async remove(
    user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null },
    id: string
  ) {
    await this.getById(user, id);
    const removed = await this.repository.remove(id);
    void recordAudit({
      actorUserId: user.userId,
      action: 'DELETE',
      resource: 'attendance',
      resourceId: id
    });
    return removed;
  }

  async summary(
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null },
    filters: { departmentId?: string; employeeId?: string; from?: string; to?: string }
  ) {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.from || filters.to) {
      where.attendanceDay = {} as Prisma.DateTimeFilter;
      if (filters.from) where.attendanceDay.gte = parseAttendanceDay(filters.from);
      if (filters.to) where.attendanceDay.lte = parseAttendanceDay(filters.to);
    }

    const [present, absent, late, total, byDepartment] = await this.repository.summary(this.applyScope(where, user));

    return {
      present,
      absent,
      late,
      total,
      presenceRate: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0,
      byDepartment: byDepartment.reduce<
        Record<string, { present: number; absent: number; late: number; total: number }>
      >((acc, item) => {
        const key = item.departmentId ?? 'unassigned';
        const bucket = acc[key] ?? { present: 0, absent: 0, late: 0, total: 0 };
        bucket.total += item._count._all;
        if (item.status === 'PRESENT') bucket.present += item._count._all;
        if (item.status === 'ABSENT') bucket.absent += item._count._all;
        if (item.status === 'LATE') bucket.late += item._count._all;
        acc[key] = bucket;
        return acc;
      }, {})
    };
  }

  private assertCheckTimes(checkInAt: Date | null, checkOutAt: Date | null) {
    if (checkInAt && checkOutAt && checkOutAt < checkInAt) {
      throw badRequest('Check-out must be on or after check-in');
    }
  }
}
