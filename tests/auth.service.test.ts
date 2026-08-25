import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/service.js';
import { createRefreshToken } from '../src/common/security/tokens.js';
import { hashPassword } from '../src/common/security/password.js';

function makeAuthRepo(overrides: Partial<Record<string, any>> = {}) {
  return {
    countUsers: vi.fn().mockResolvedValue(0),
    findUserByEmail: vi.fn(),
    findUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn().mockResolvedValue({}),
    getPermissionsForRole: vi.fn().mockResolvedValue([{ permission: { code: 'dashboard:read' } }]),
    createRefreshToken: vi.fn().mockResolvedValue({}),
    findRefreshTokenByHash: vi.fn(),
    revokeRefreshTokenByHash: vi.fn().mockResolvedValue({}),
    revokeRefreshTokensForUser: vi.fn().mockResolvedValue({ count: 1 }),
    createResetToken: vi.fn().mockResolvedValue({}),
    findResetTokenByHash: vi.fn(),
    markResetTokenUsed: vi.fn().mockResolvedValue({}),
    ...overrides
  };
}

describe('AuthService', () => {
  it('registers the initial admin only on an empty database', async () => {
    const repository = makeAuthRepo();
    repository.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'admin@arkena.local',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      firstName: 'Super',
      lastName: 'Admin',
      phone: null,
      jobTitle: null
    });

    const service = new AuthService(repository as any);
    const result = await service.registerInitialAdmin({
      email: 'admin@arkena.local',
      password: 'ChangeMe123!',
      firstName: 'Super',
      lastName: 'Admin'
    });

    expect(repository.createUser).toHaveBeenCalledOnce();
    expect(result.accessToken).toBeTypeOf('string');
    expect(result.refreshToken).toBeTypeOf('string');
  });

  it('rejects initial admin registration when users already exist', async () => {
    const repository = makeAuthRepo({ countUsers: vi.fn().mockResolvedValue(2) });
    const service = new AuthService(repository as any);

    await expect(
      service.registerInitialAdmin({
        email: 'admin@arkena.local',
        password: 'ChangeMe123!',
        firstName: 'Super',
        lastName: 'Admin'
      })
    ).rejects.toThrow(/empty database/i);
  });

  it('logs in an active user and updates last login time', async () => {
    const repository = makeAuthRepo();
    const passwordHash = await hashPassword('ChangeMe123!');
    repository.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'admin@arkena.local',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      firstName: 'Super',
      lastName: 'Admin',
      phone: null,
      jobTitle: null
    });

    const service = new AuthService(repository as any);
    await expect(
      service.login({
        email: 'admin@arkena.local',
        password: 'ChangeMe123!'
      })
    ).resolves.toHaveProperty('accessToken');
    expect(repository.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ lastLoginAt: expect.any(Date) }));
  });

  it('rotates a refresh token on refresh', async () => {
    const repository = makeAuthRepo();
    const refreshToken = createRefreshToken({
      sub: 'user-1',
      familyId: 'family-1',
      jti: 'old-jti'
    });

    repository.findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      jti: 'old-jti',
      familyId: 'family-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: {
        id: 'user-1',
        email: 'admin@arkena.local',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        firstName: 'Super',
        lastName: 'Admin',
        phone: null,
        jobTitle: null
      }
    });

    const service = new AuthService(repository as any);
    const result = await service.refresh({ refreshToken });

    expect(repository.revokeRefreshTokenByHash).toHaveBeenCalledOnce();
    expect(result.refreshToken).toBeTypeOf('string');
  });

  it('changes password after verifying the current password', async () => {
    const repository = makeAuthRepo();
    const passwordHash = await hashPassword('ChangeMe123!');
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      email: 'admin@arkena.local',
      firstName: 'Super',
      lastName: 'Admin',
      phone: null,
      jobTitle: null
    });

    const service = new AuthService(repository as any);
    await expect(
      service.changePassword('user-1', {
        currentPassword: 'ChangeMe123!',
        newPassword: 'NewPassword123!'
      })
    ).resolves.toEqual({ changed: true });
  });
});
