import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/service.js';
import { createRefreshToken, createResetToken, hashToken, verifyRefreshToken } from '../src/common/security/tokens.js';
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
    revokeRefreshTokensForFamily: vi.fn().mockResolvedValue({ count: 1 }),
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
    const rotatedPayload = verifyRefreshToken(result.refreshToken);
    expect(rotatedPayload.familyId).toBe('family-1');
    expect(rotatedPayload.jti).not.toBe('old-jti');
    expect(repository.revokeRefreshTokenByHash).toHaveBeenCalledWith(hashToken(refreshToken), rotatedPayload.jti);
    expect(result.refreshToken).toBeTypeOf('string');
  });

  it('revokes a refresh-token family when a rotated token is reused', async () => {
    const repository = makeAuthRepo();
    const refreshToken = createRefreshToken({
      sub: 'user-1',
      familyId: 'family-reused',
      jti: 'old-jti'
    });

    repository.findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      jti: 'old-jti',
      familyId: 'family-reused',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      user: { id: 'user-1', status: 'ACTIVE' }
    });

    const service = new AuthService(repository as any);
    await expect(service.refresh({ refreshToken })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(repository.revokeRefreshTokensForFamily).toHaveBeenCalledWith('family-reused');
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

  it('logs out a stored refresh token and revokes that session', async () => {
    const repository = makeAuthRepo();
    const refreshToken = createRefreshToken({
      sub: 'user-1',
      familyId: 'family-1',
      jti: 'logout-jti'
    });

    repository.findRefreshTokenByHash.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: null,
      user: {
        id: 'user-1'
      }
    });

    const service = new AuthService(repository as any);
    await expect(service.logout(refreshToken)).resolves.toEqual({ loggedOut: true });
    expect(repository.revokeRefreshTokenByHash).toHaveBeenCalledWith(hashToken(refreshToken));
  });

  it('revokes every refresh token for a user on logout-all', async () => {
    const repository = makeAuthRepo();
    const service = new AuthService(repository as any);

    await expect(service.logoutAll('user-1')).resolves.toEqual({ loggedOut: true });
    expect(repository.revokeRefreshTokensForUser).toHaveBeenCalledWith('user-1');
  });

  it('returns a reset token in test mode and stores a hashed reset token', async () => {
    const repository = makeAuthRepo();
    repository.findUserByEmail.mockResolvedValue({
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
    const result = await service.forgotPassword({
      email: 'admin@arkena.local',
      ip: '127.0.0.1',
      userAgent: 'Vitest'
    });

    expect(result.resetRequested).toBe(true);
    expect(result.resetToken).toBeTypeOf('string');
    expect(repository.createResetToken).toHaveBeenCalledTimes(1);
    const persisted = repository.createResetToken.mock.calls[0][0];
    expect(persisted.tokenHash).toHaveLength(64);
    expect(persisted.purpose).toBe('PASSWORD_RESET');
  });

  it('resets a password, marks the token used and revokes all sessions', async () => {
    const repository = makeAuthRepo();
    const resetToken = createResetToken({
      sub: 'user-1',
      jti: 'reset-jti',
      purpose: 'PASSWORD_RESET'
    });

    repository.findResetTokenByHash.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 1000 * 60),
      user: {
        id: 'user-1'
      }
    });

    const service = new AuthService(repository as any);
    await expect(
      service.resetPassword({
        token: resetToken,
        password: 'NewPassword123!'
      })
    ).resolves.toEqual({ reset: true });

    expect(repository.updateUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        passwordHash: expect.any(String)
      })
    );
    expect(repository.markResetTokenUsed).toHaveBeenCalledWith('reset-1');
    expect(repository.revokeRefreshTokensForUser).toHaveBeenCalledWith('user-1');
  });

  it('returns the current user profile and permission list', async () => {
    const repository = makeAuthRepo();
    repository.findUserById.mockResolvedValue({
      id: 'user-1',
      email: 'admin@arkena.local',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+0000000000',
      jobTitle: 'Chief',
      employee: {
        id: 'emp-1',
        departmentId: 'dep-1'
      }
    });
    repository.getPermissionsForRole.mockResolvedValue([
      { permission: { code: 'dashboard:read' } },
      { permission: { code: 'employee:read' } }
    ]);

    const service = new AuthService(repository as any);
    await expect(service.me('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'admin@arkena.local',
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+0000000000',
      jobTitle: 'Chief',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      permissions: ['dashboard:read', 'employee:read'],
      employee: {
        id: 'emp-1',
        departmentId: 'dep-1'
      }
    });
  });
});
