import { Prisma } from '@prisma/client';
import { notFound } from '../../common/errors/http-error.js';
import { offsetFromPage } from '../../common/http/query.js';
import { EmployeesRepository } from './repository.js';

export class EmployeesService {
  constructor(private readonly repository = new EmployeesRepository()) {}

  async list(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc'; departmentId?: string; status?: string }) {
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
      where.status = query.status as any;
    }

    const sortBy = query.sortBy && ['createdAt', 'firstName', 'lastName', 'hireDate', 'employeeNumber'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const [items, total] = await Promise.all([
      this.repository.listEmployees(where, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.EmployeeOrderByWithRelationInput),
      this.repository.countEmployees(where)
    ]);

    return { items, total };
  }

  async getById(id: string) {
    const employee = await this.repository.findById(id);
    if (!employee) {
      throw notFound('Employee not found');
    }
    return employee;
  }

  create(input: {
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
    notes?: string | null;
  }) {
    return this.repository.create({
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
  }

  async update(id: string, input: Record<string, unknown>) {
    await this.getById(id);
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

    return this.repository.update(id, data);
  }

  async archive(id: string, archivedAt?: string) {
    await this.getById(id);
    return this.repository.archive(id, archivedAt ? new Date(archivedAt) : new Date());
  }
}
