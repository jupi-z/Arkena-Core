import { Prisma } from '@prisma/client';
import { notFound } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
import { offsetFromPage } from '../../common/http/query.js';
import { DepartmentsRepository } from './repository.js';

export class DepartmentsService {
  constructor(private readonly repository = new DepartmentsRepository()) {}

  async list(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc' }) {
    const where: Prisma.DepartmentWhereInput = {};
    if (query.search) {
      where.OR = [
        { code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const sortBy = query.sortBy && ['code', 'name', 'createdAt'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const [items, total] = await Promise.all([
      this.repository.listDepartments(where, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.DepartmentOrderByWithRelationInput),
      this.repository.countDepartments(where)
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const department = await this.repository.findById(id);
    if (!department) {
      throw notFound('Department not found');
    }
    return department;
  }

  async create(input: { code: string; name: string; description?: string | null; managerEmployeeId?: string | null; actorUserId?: string }) {
    const { actorUserId, ...departmentData } = input;
    const created = await this.repository.create(departmentData);
    void recordAudit({
      actorUserId,
      action: 'CREATE',
      resource: 'department',
      resourceId: created.id,
      afterData: created
    });
    return created;
  }

  async update(id: string, input: { name?: string; description?: string | null; managerEmployeeId?: string | null }, actorUserId?: string) {
    const before = await this.getById(id);
    const updated = await this.repository.update(id, input);
    void recordAudit({
      actorUserId,
      action: 'UPDATE',
      resource: 'department',
      resourceId: id,
      beforeData: before,
      afterData: updated
    });
    return updated;
  }

  async remove(id: string, actorUserId?: string) {
    const before = await this.getById(id);
    const removed = await this.repository.remove(id);
    void recordAudit({
      actorUserId,
      action: 'DELETE',
      resource: 'department',
      resourceId: id,
      beforeData: before,
      afterData: removed
    });
    return removed;
  }
}
