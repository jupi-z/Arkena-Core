import { describe, expect, it, vi } from 'vitest';
import { UsersService } from '../src/modules/users/service.js';

const baseUser = {
  id: 'user-1',
  email: 'employee@arkena.local',
  firstName: 'Amina',
  lastName: 'Diallo',
  phone: null,
  jobTitle: null,
  role: 'EMPLOYEE' as const,
  status: 'ACTIVE' as const,
  emailVerifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  employee: null,
  passwordHash: 'hashed-password',
  refreshTokens: [{ id: 'refresh-1' }]
};

describe('UsersService', () => {
  it('does not expose password hashes or refresh tokens in lists', async () => {
    const repository = {
      listUsers: vi.fn().mockResolvedValue([baseUser]),
      countUsers: vi.fn().mockResolvedValue(1),
      findUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      revokeRefreshTokensForUser: vi.fn()
    };

    const service = new UsersService(repository as any);
    const result = await service.list({
      page: 1,
      limit: 20,
      sortOrder: 'desc',
      status: 'ACTIVE'
    });

    expect(repository.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      0,
      20,
      expect.any(Object)
    );
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(result.items[0]).not.toHaveProperty('refreshTokens');
  });

  it('creates users with a hashed password and normalized email', async () => {
    const repository = {
      listUsers: vi.fn(),
      countUsers: vi.fn(),
      findUserById: vi.fn(),
      createUser: vi.fn().mockResolvedValue({
        ...baseUser,
        id: 'user-2',
        email: 'new.user@arkena.local',
        passwordHash: 'hashed-password'
      }),
      updateUser: vi.fn(),
      revokeRefreshTokensForUser: vi.fn()
    };

    const service = new UsersService(repository as any);
    const result = await service.create({
      email: 'New.User@Arkena.Local',
      password: 'StrongPassword123!',
      firstName: 'New',
      lastName: 'User',
      role: 'HR',
      actorUserId: 'admin-1',
      actorRole: 'ADMIN'
    });

    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new.user@arkena.local',
        passwordHash: expect.not.stringMatching('StrongPassword123!'),
        role: 'HR',
        status: 'ACTIVE'
      })
    );
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects privileged user creation unless the actor is a super admin', async () => {
    const repository = {
      listUsers: vi.fn(),
      countUsers: vi.fn(),
      findUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      revokeRefreshTokensForUser: vi.fn()
    };

    const service = new UsersService(repository as any);

    await expect(service.create({
      email: 'new.admin@arkena.local',
      password: 'StrongPassword123!',
      firstName: 'New',
      lastName: 'Admin',
      role: 'ADMIN',
      actorUserId: 'admin-1',
      actorRole: 'ADMIN'
    })).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN'
    });

    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it('suspends a user and revokes active sessions', async () => {
    const suspendedUser = {
      ...baseUser,
      status: 'SUSPENDED' as const
    };
    const repository = {
      listUsers: vi.fn(),
      countUsers: vi.fn(),
      findUserById: vi.fn().mockResolvedValue(baseUser),
      createUser: vi.fn(),
      updateUser: vi.fn().mockResolvedValue(suspendedUser),
      revokeRefreshTokensForUser: vi.fn().mockResolvedValue({ count: 2 })
    };

    const service = new UsersService(repository as any);
    const result = await service.suspend('user-1', 'admin-1');

    expect(repository.updateUser).toHaveBeenCalledWith('user-1', {
      status: 'SUSPENDED'
    });
    expect(repository.revokeRefreshTokensForUser).toHaveBeenCalledWith('user-1');
    expect(result.status).toBe('SUSPENDED');
    expect(result).not.toHaveProperty('refreshTokens');
  });

  it('revokes active sessions when an update disables a user', async () => {
    const inactiveUser = {
      ...baseUser,
      status: 'INACTIVE' as const
    };
    const repository = {
      listUsers: vi.fn(),
      countUsers: vi.fn(),
      findUserById: vi.fn().mockResolvedValue(baseUser),
      createUser: vi.fn(),
      updateUser: vi.fn().mockResolvedValue(inactiveUser),
      revokeRefreshTokensForUser: vi.fn().mockResolvedValue({ count: 1 })
    };

    const service = new UsersService(repository as any);
    const result = await service.update('user-1', { status: 'INACTIVE' }, 'admin-1');

    expect(repository.revokeRefreshTokensForUser).toHaveBeenCalledWith('user-1');
    expect(result.status).toBe('INACTIVE');
  });

  it('revokes active sessions when a role changes', async () => {
    const hrUser = {
      ...baseUser,
      role: 'HR' as const
    };
    const repository = {
      listUsers: vi.fn(),
      countUsers: vi.fn(),
      findUserById: vi.fn().mockResolvedValue(baseUser),
      createUser: vi.fn(),
      updateUser: vi.fn().mockResolvedValue(hrUser),
      revokeRefreshTokensForUser: vi.fn().mockResolvedValue({ count: 1 })
    };

    const service = new UsersService(repository as any);
    const result = await service.assignRole('user-1', 'HR', 'admin-1');

    expect(repository.updateUser).toHaveBeenCalledWith('user-1', { role: 'HR' });
    expect(repository.revokeRefreshTokensForUser).toHaveBeenCalledWith('user-1');
    expect(result.role).toBe('HR');
  });
});
