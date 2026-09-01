import { Prisma, RoleName, UserStatus } from '@prisma/client';
import { badRequest, conflict, notFound } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
import { offsetFromPage } from '../../common/http/query.js';
import { hashPassword } from '../../common/security/password.js';
import { UsersRepository } from './repository.js';

export class UsersService {
  constructor(private readonly repository = new UsersRepository()) {}

  private serializeUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    jobTitle: string | null;
    role: RoleName;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    employee?: unknown;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      employee: user.employee ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

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
      items: items.map((user) => this.serializeUser(user)),
      total
    };
  }

  async getById(id: string) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    return this.serializeUser(user);
  }

  async create(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    jobTitle?: string | null;
    role?: RoleName;
    status?: UserStatus;
    actorUserId?: string;
  }) {
    try {
      const created = await this.repository.createUser({
        email: input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        jobTitle: input.jobTitle,
        role: input.role ?? 'EMPLOYEE',
        status: input.status ?? 'ACTIVE'
      });

      void recordAudit({
        actorUserId: input.actorUserId,
        action: 'CREATE',
        resource: 'user',
        resourceId: created.id,
        metadata: {
          email: created.email,
          role: created.role
        }
      });

      return this.serializeUser(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('User email already exists');
      }
      throw error;
    }
  }

  async update(id: string, input: { firstName?: string; lastName?: string; phone?: string | null; jobTitle?: string | null; status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }, actorUserId?: string) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    if (input.status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(input.status)) {
      throw badRequest('Invalid status');
    }

    const updated = await this.repository.updateUser(id, input);
    const sessionsRevoked = Boolean(input.status && input.status !== 'ACTIVE' && user.status === 'ACTIVE');
    if (sessionsRevoked) {
      await this.repository.revokeRefreshTokensForUser(id);
    }

    void recordAudit({
      actorUserId,
      action: 'UPDATE',
      resource: 'user',
      resourceId: id,
      beforeData: this.serializeUser(user),
      afterData: this.serializeUser(updated),
      metadata: sessionsRevoked ? { sessionsRevoked: true, reason: 'status-change' } : undefined
    });
    return this.serializeUser(updated);
  }

  async assignRole(id: string, role: Prisma.UserUpdateInput['role'], actorUserId?: string) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const updated = await this.repository.updateUser(id, { role });
    await this.repository.revokeRefreshTokensForUser(id);
    void recordAudit({
      actorUserId,
      action: 'ASSIGN',
      resource: 'user',
      resourceId: id,
      beforeData: this.serializeUser(user),
      afterData: this.serializeUser(updated),
      metadata: {
        role,
        sessionsRevoked: true,
        reason: 'role-change'
      }
    });
    return this.serializeUser(updated);
  }

  async suspend(id: string, actorUserId?: string) {
    const user = await this.repository.findUserById(id);
    if (!user) {
      throw notFound('User not found');
    }

    const updated = await this.repository.updateUser(id, { status: 'SUSPENDED' });
    await this.repository.revokeRefreshTokensForUser(id);
    void recordAudit({
      actorUserId,
      action: 'DELETE',
      resource: 'user',
      resourceId: id,
      beforeData: this.serializeUser(user),
      afterData: this.serializeUser(updated),
      metadata: {
        softDelete: true,
        sessionsRevoked: true
      }
    });
    return this.serializeUser(updated);
  }
}
