import { Prisma } from '@prisma/client';
import { notFound } from '../../common/errors/http-error.js';
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

  create(input: { code: string; name: string; description?: string | null; managerEmployeeId?: string | null }) {
    return this.repository.create(input);
  }

  async update(id: string, input: { name?: string; description?: string | null; managerEmployeeId?: string | null }) {
    await this.getById(id);
    return this.repository.update(id, input);
  }

  async remove(id: string) {
    await this.getById(id);
    return this.repository.remove(id);
  }
}
