import type { Prisma, RoleName } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class AuthRepository {
  countUsers(): Promise<number> {
    return prisma.user.count();
  }

  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        employee: true
      }
    });
  }

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        employee: true
      }
    });
  }

  createUser(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  getPermissionsForRole(role: RoleName) {
    return prisma.rolePermission.findMany({
      where: { role },
      include: {
        permission: true
      }
    });
  }

  createRefreshToken(data: Prisma.RefreshTokenCreateInput) {
    return prisma.refreshToken.create({ data });
  }

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });
  }

  revokeRefreshTokenByHash(tokenHash: string, replacedByJti?: string) {
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: {
        revokedAt: new Date(),
        replacedByJti
      }
    });
  }

  revokeRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  revokeRefreshTokensForFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });
  }

  createResetToken(data: Prisma.PasswordResetTokenCreateInput) {
    return prisma.passwordResetToken.create({ data });
  }

  findResetTokenByHash(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });
  }

  markResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: {
        usedAt: new Date()
      }
    });
  }
}
