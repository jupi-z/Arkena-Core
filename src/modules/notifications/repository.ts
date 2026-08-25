import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';

export class NotificationsRepository {
  listNotifications(where: Prisma.NotificationWhereInput, skip: number, take: number, orderBy: Prisma.NotificationOrderByWithRelationInput) {
    return prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        recipientUser: true,
        createdByUser: true
      }
    });
  }

  countNotifications(where: Prisma.NotificationWhereInput) {
    return prisma.notification.count({ where });
  }

  create(data: Prisma.NotificationCreateInput) {
    return prisma.notification.create({ data });
  }

  markRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: {
        readAt: new Date()
      }
    });
  }
}
