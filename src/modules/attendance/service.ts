import { Prisma, RoleName } from '@prisma/client';
import { badRequest, forbidden, notFound } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
import { offsetFromPage } from '../../common/http/query.js';
import { AttendanceRepository } from './repository.js';

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

  async list(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, query: {
    page: number;
    limit: number;
    search?: string;
    sortBy?: string;
    sortOrder: 'asc' | 'desc';
    employeeId?: string;
    departmentId?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    const where: Prisma.AttendanceRecordWhereInput = {};

    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.status = query.status as any;
    if (query.from || query.to) {
      where.attendanceDate = {} as Prisma.DateTimeFilter;
      if (query.from) where.attendanceDate.gte = new Date(query.from);
      if (query.to) where.attendanceDate.lte = new Date(query.to);
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

    const sortBy = query.sortBy && ['attendanceDate', 'createdAt', 'updatedAt'].includes(query.sortBy) ? query.sortBy : 'attendanceDate';
    const scopedWhere = this.applyScope(where, user);
    const [items, total] = await Promise.all([
      this.repository.listAttendance(scopedWhere, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.AttendanceRecordOrderByWithRelationInput),
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

  async create(user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null }, input: {
    employeeId: string;
    departmentId?: string | null;
    attendanceDate: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
    checkInAt?: string | null;
    checkOutAt?: string | null;
    comment?: string | null;
    source?: string | null;
  }) {
    if (!this.canAccess(user, { employeeId: input.employeeId, departmentId: input.departmentId })) {
      throw forbidden();
    }

    const attendanceDate = new Date(input.attendanceDate);
    const existing = await this.repository.findByUnique(input.employeeId, attendanceDate);
    if (existing) {
      throw badRequest('Attendance record already exists for that employee and date');
    }

    const created = await this.repository.create({
      employee: {
        connect: {
          id: input.employeeId
        }
      },
      department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
      attendanceDate,
      status: input.status,
      checkInAt: input.checkInAt ? new Date(input.checkInAt) : undefined,
      checkOutAt: input.checkOutAt ? new Date(input.checkOutAt) : undefined,
      comment: input.comment,
      source: input.source,
      recordedByUser: { connect: { id: user.userId } }
    });

    void recordAudit({
      actorUserId: user.userId,
      action: 'CREATE',
      resource: 'attendance',
      resourceId: created.id
    });

    return created;
  }

  async update(user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string, input: Record<string, unknown>) {
    const record = await this.getById(user, id);
    const data: Prisma.AttendanceRecordUpdateInput = {};

    if (typeof input.departmentId === 'string') data.department = { connect: { id: input.departmentId } };
    if (input.departmentId === null) data.department = { disconnect: true };
    if (typeof input.attendanceDate === 'string') data.attendanceDate = new Date(input.attendanceDate);
    if (typeof input.status === 'string') data.status = input.status as Prisma.AttendanceRecordUpdateInput['status'];
    if (typeof input.checkInAt === 'string') data.checkInAt = new Date(input.checkInAt);
    if (typeof input.checkOutAt === 'string') data.checkOutAt = new Date(input.checkOutAt);
    if (typeof input.comment === 'string' || input.comment === null) data.comment = input.comment as string | null;
    if (typeof input.source === 'string' || input.source === null) data.source = input.source as string | null;

    if (!record) {
      throw notFound('Attendance record not found');
    }

    const updated = await this.repository.update(id, data);
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

  async remove(user: { userId: string; role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string) {
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

  async summary(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, filters: { departmentId?: string; employeeId?: string; from?: string; to?: string }) {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.from || filters.to) {
      where.attendanceDate = {} as Prisma.DateTimeFilter;
      if (filters.from) where.attendanceDate.gte = new Date(filters.from);
      if (filters.to) where.attendanceDate.lte = new Date(filters.to);
    }

    const [present, absent, late, total, byDepartment] = await this.repository.summary(this.applyScope(where, user));

    return {
      present,
      absent,
      late,
      total,
      presenceRate: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0,
      byDepartment: byDepartment.reduce<Record<string, { present: number; absent: number; late: number; total: number }>>((acc, item) => {
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
}
