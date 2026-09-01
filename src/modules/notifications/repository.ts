import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  jobTitle: true,
  role: true,
  status: true
} satisfies Prisma.UserSelect;

export class NotificationsRepository {
  listNotifications(where: Prisma.NotificationWhereInput, skip: number, take: number, orderBy: Prisma.NotificationOrderByWithRelationInput) {
    return prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        recipientUser: {
          select: publicUserSelect
        },
        createdByUser: {
          select: publicUserSelect
        }
      }
    });
  }

  countNotifications(where: Prisma.NotificationWhereInput) {
    return prisma.notification.count({ where });
  }

  create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  }

  findById(id: string) {
    return prisma.notification.findUnique({
      where: { id },
      include: {
        recipientUser: {
          select: publicUserSelect
        },
        createdByUser: {
          select: publicUserSelect
        }
      }
    });
  }

  markRead(id: string, recipientUserId: string) {
    return prisma.notification.updateMany({
      where: {
        id,
        recipientUserId
      },
      data: {
        readAt: new Date()
      }
    });
  }
}
