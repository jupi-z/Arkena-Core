import { Prisma } from '@prisma/client';
import { badRequest, notFound } from '../../common/errors/http-error.js';
import { offsetFromPage } from '../../common/http/query.js';
import { UsersRepository } from './repository.js';

export class UsersService {
  constructor(private readonly repository = new UsersRepository()) {}

  async list(query: { page: number; limit: number; search?: string; sortBy?: string; sortOrder: 'asc' | 'desc' }) {
    const where: Prisma.UserWhereInput = {};
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const sortBy = query.sortBy && ['email', 'firstName', 'lastName', 'createdAt'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const orderBy = { [sortBy]: query.sortOrder } as Prisma.UserOrderByWithRelationInput;
    const [items, total] = await Promise.all([
      this.repository.listUsers(where, offsetFromPage(query.page, query.limit), query.limit, orderBy),
      this.repository.countUsers(where)
    ]);

    return {
      items,
      total
    };
  }

  async getById(id: string) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    return user;
  }

  async update(id: string, input: { firstName?: string; lastName?: string; phone?: string | null; jobTitle?: string | null; status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    if (input.status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(input.status)) {
      throw badRequest('Invalid status');
    }

    return this.repository.updateUser(id, input);
  }

  async assignRole(id: string, role: Prisma.UserUpdateInput['role']) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    return this.repository.updateUser(id, { role });
  }
}
