import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class UsersRepository {
  listUsers(where: Prisma.UserWhereInput, skip: number, take: number, orderBy: Prisma.UserOrderByWithRelationInput) {
    return prisma.user.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        employee: true
      }
    });
  }

  countUsers(where: Prisma.UserWhereInput) {
    return prisma.user.count({ where });
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
    return prisma.user.create({
      data,
      include: {
        employee: true
      }
    });
  }

  updateUser(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      include: {
        employee: true
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
}
