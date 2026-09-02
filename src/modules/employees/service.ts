import { Prisma, RoleName } from '@prisma/client';
import { forbidden, notFound } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
import { offsetFromPage } from '../../common/http/query.js';
import { EmployeesRepository } from './repository.js';

export class EmployeesService {
  constructor(private readonly repository = new EmployeesRepository()) {}

  private applyScope(
    where: Prisma.EmployeeWhereInput,
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }
  ): Prisma.EmployeeWhereInput {
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
          id: user.employeeId ?? '__no_employee__'
        }
      ]
    };
  }

  private canAccess(
    user: { role: RoleName; employeeId?: string | null; departmentId?: string | null },
    employee: { id: string; departmentId?: string | null }
  ): boolean {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return true;
    }

    if (user.role === 'MANAGER') {
      return Boolean(user.departmentId && employee.departmentId && user.departmentId === employee.departmentId);
    }

    return user.employeeId === employee.id;
  }

  async list(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc'; departmentId?: string; status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'ARCHIVED' }) {
    const where: Prisma.EmployeeWhereInput = {};

    if (query.search) {
      where.OR = [
        { employeeNumber: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const sortBy = query.sortBy && ['createdAt', 'firstName', 'lastName', 'hireDate', 'employeeNumber'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const scopedWhere = this.applyScope(where, user);
    const [items, total] = await Promise.all([
      this.repository.listEmployees(scopedWhere, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.EmployeeOrderByWithRelationInput),
      this.repository.countEmployees(scopedWhere)
    ]);

    return { items, total };
  }

  async getById(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }, id: string) {
    const employee = await this.repository.findById(id);
    if (!employee) {
      throw notFound('Employee not found');
    }
    if (!this.canAccess(user, employee)) {
      throw forbidden();
    }
    return employee;
  }

  async create(input: {
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    jobTitle?: string | null;
    hireDate: string;
    status: string;
    departmentId?: string | null;
    managerId?: string | null;
    userId?: string | null;
    actorUserId?: string;
    notes?: string | null;
  }) {
    const created = await this.repository.create({
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      jobTitle: input.jobTitle,
      hireDate: new Date(input.hireDate),
      status: input.status as Prisma.EmployeeCreateInput['status'],
      notes: input.notes,
      department: input.departmentId ? { connect: { id: input.departmentId } } : undefined,
      manager: input.managerId ? { connect: { id: input.managerId } } : undefined,
      user: input.userId ? { connect: { id: input.userId } } : undefined
    });

    void recordAudit({
      actorUserId: input.actorUserId,
      action: 'CREATE',
      resource: 'employee',
      resourceId: created.id,
      metadata: {
        employeeNumber: created.employeeNumber
      }
    });

    return created;
  }

  async update(id: string, input: Record<string, unknown>, actorUserId?: string) {
    const before = await this.repository.findById(id);
    if (!before) {
      throw notFound('Employee not found');
    }
    const data: Prisma.EmployeeUpdateInput = {};

    if (typeof input.firstName === 'string') data.firstName = input.firstName;
    if (typeof input.lastName === 'string') data.lastName = input.lastName;
    if (typeof input.email === 'string') data.email = input.email.toLowerCase();
    if (typeof input.phone === 'string' || input.phone === null) data.phone = input.phone as string | null;
    if (typeof input.jobTitle === 'string' || input.jobTitle === null) data.jobTitle = input.jobTitle as string | null;
    if (typeof input.hireDate === 'string') data.hireDate = new Date(input.hireDate);
    if (typeof input.status === 'string') data.status = input.status as Prisma.EmployeeUpdateInput['status'];
    if (typeof input.notes === 'string' || input.notes === null) data.notes = input.notes as string | null;
    if (typeof input.departmentId === 'string') data.department = { connect: { id: input.departmentId } };
    if (input.departmentId === null) data.department = { disconnect: true };
    if (typeof input.managerId === 'string') data.manager = { connect: { id: input.managerId } };
    if (input.managerId === null) data.manager = { disconnect: true };
    if (typeof input.userId === 'string') data.user = { connect: { id: input.userId } };
    if (input.userId === null) data.user = { disconnect: true };

    const updated = await this.repository.update(id, data);
    void recordAudit({
      actorUserId,
      action: 'UPDATE',
      resource: 'employee',
      resourceId: id,
      beforeData: before,
      afterData: updated
    });
    return updated;
  }

  async archive(id: string, archivedAt?: string, actorUserId?: string) {
    const before = await this.repository.findById(id);
    if (!before) {
      throw notFound('Employee not found');
    }

    const archived = await this.repository.archive(id, archivedAt ? new Date(archivedAt) : new Date());
    void recordAudit({
      actorUserId,
      action: 'DELETE',
      resource: 'employee',
      resourceId: id,
      beforeData: before,
      afterData: archived,
      metadata: {
        archived: true
      }
    });
    return archived;
  }
}
