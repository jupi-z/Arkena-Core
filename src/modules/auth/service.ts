import type { RoleName } from '@prisma/client';
import { env } from '../../config/env.js';
import { badRequest, forbidden, unauthorized } from '../../common/errors/http-error.js';
import { hashPassword, verifyPassword } from '../../common/security/password.js';
import {
  createAccessToken,
  createRefreshToken,
  createResetToken,
  hashToken,
  randomToken,
  verifyRefreshToken,
  verifyResetToken
} from '../../common/security/tokens.js';
import { AuthRepository } from './repository.js';

type AuthenticatedUser = {
  id: string;
  email: string;
  role: RoleName;
  status: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  jobTitle: string | null;
  employee?: unknown;
};

function buildPermissionList(items: Array<{ permission: { code: string } }>): string[] {
  return items.map((item) => item.permission.code);
}

export class AuthService {
  constructor(private readonly repository = new AuthRepository()) {}

  private async issueSession(user: AuthenticatedUser) {
    const permissions = buildPermissionList(await this.repository.getPermissionsForRole(user.role));
    const familyId = randomToken();
    const jti = randomToken();
    const refreshJti = randomToken();
    const accessToken = createAccessToken({
      sub: user.id,
      role: user.role,
      permissions,
      jti
    });
    const refreshToken = createRefreshToken({
      sub: user.id,
      familyId,
      jti: refreshJti
    });
    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date();

    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);

    await this.repository.createRefreshToken({
      jti: refreshJti,
      familyId,
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
      user: {
        connect: {
          id: user.id
        }
      }
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        jobTitle: user.jobTitle,
        permissions
      }
    };
  }

  async registerInitialAdmin(input: { email: string; password: string; firstName: string; lastName: string; phone?: string }) {
    const userCount = await this.repository.countUsers();
    if (userCount > 0) {
      throw forbidden('Initial admin registration is only available on an empty database');
    }

    const user = await this.repository.createUser({
      email: input.email.toLowerCase(),
      passwordHash: await hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    });

    return this.issueSession(user as AuthenticatedUser);
  }

  async login(input: { email: string; password: string }) {
    const user = await this.repository.findUserByEmail(input.email.toLowerCase());
    if (!user || user.status !== 'ACTIVE') {
      throw unauthorized();
    }

    const passwordValid = await verifyPassword(input.password, user.passwordHash);
    if (!passwordValid) {
      throw unauthorized();
    }

    await this.repository.updateUser(user.id, {
      lastLoginAt: new Date()
    });

    return this.issueSession(user as AuthenticatedUser);
  }

  async refresh(input: { refreshToken: string }) {
    const tokenPayload = verifyRefreshToken(input.refreshToken);
    const hashedToken = hashToken(input.refreshToken);
    const stored = await this.repository.findRefreshTokenByHash(hashedToken);

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.jti !== tokenPayload.jti) {
      throw unauthorized();
    }

    await this.repository.revokeRefreshTokenByHash(hashedToken, tokenPayload.jti);
    const user = stored.user;

    if (!user || user.status !== 'ACTIVE') {
      throw unauthorized();
    }

    return this.issueSession(user as AuthenticatedUser);
  }

  async logout(refreshToken: string) {
    const hashedToken = hashToken(refreshToken);
    const stored = await this.repository.findRefreshTokenByHash(hashedToken);
    if (stored && !stored.revokedAt) {
      await this.repository.revokeRefreshTokenByHash(hashedToken);
    }
    return { loggedOut: true };
  }

  async logoutAll(userId: string) {
    await this.repository.revokeRefreshTokensForUser(userId);
    return { loggedOut: true };
  }

  async forgotPassword(input: { email: string; ip?: string; userAgent?: string }) {
    const user = await this.repository.findUserByEmail(input.email.toLowerCase());
    if (!user) {
      return { resetRequested: true };
    }

    const jti = randomToken();
    const token = createResetToken({
      sub: user.id,
      jti,
      purpose: 'PASSWORD_RESET'
    });
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.repository.createResetToken({
      user: {
        connect: {
          id: user.id
        }
      },
      tokenHash: hashToken(token),
      purpose: 'PASSWORD_RESET',
      expiresAt,
      requestedIp: input.ip,
      requestedUserAgent: input.userAgent
    });

    return {
      resetRequested: true,
      resetToken: env.NODE_ENV === 'production' ? undefined : token
    };
  }

  async resetPassword(input: { token: string; password: string }) {
    const payload = verifyResetToken(input.token);
    const hashedToken = hashToken(input.token);
    const stored = await this.repository.findResetTokenByHash(hashedToken);

    if (!stored || stored.usedAt || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
      throw unauthorized();
    }

    await this.repository.updateUser(stored.userId, {
      passwordHash: await hashPassword(input.password)
    });
    await this.repository.markResetTokenUsed(stored.id);
    await this.repository.revokeRefreshTokensForUser(stored.userId);

    return { reset: true };
  }

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw unauthorized();
    }

    const passwordValid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw badRequest('Current password is incorrect');
    }

    await this.repository.updateUser(userId, {
      passwordHash: await hashPassword(input.newPassword)
    });
    await this.repository.revokeRefreshTokensForUser(userId);
    return { changed: true };
  }

  async me(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw unauthorized();
    }

    const permissions = buildPermissionList(await this.repository.getPermissionsForRole(user.role));
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      jobTitle: user.jobTitle,
      role: user.role,
      status: user.status,
      permissions,
      employee: user.employee ?? null
    };
  }
}
