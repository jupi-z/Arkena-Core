import { Prisma } from '@prisma/client';
import { notFound } from '../../common/errors/http-error.js';
import { offsetFromPage } from '../../common/http/query.js';
import { NotificationsRepository } from './repository.js';

export class NotificationsService {
  constructor(private readonly repository = new NotificationsRepository()) {}

  async list(userId: string, query: { page: number; limit: number; sortBy?: string; sortOrder: 'asc' | 'desc' }) {
    const where: Prisma.NotificationWhereInput = {
      recipientUserId: userId
    };

    const sortBy = query.sortBy && ['createdAt', 'readAt', 'type'].includes(query.sortBy) ? query.sortBy : 'createdAt';
    const [items, total] = await Promise.all([
      this.repository.listNotifications(where, offsetFromPage(query.page, query.limit), query.limit, { [sortBy]: query.sortOrder } as Prisma.NotificationOrderByWithRelationInput),
      this.repository.countNotifications(where)
    ]);

    return { items, total };
  }

  create(input: {
    recipientUserId: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'SYSTEM';
    title: string;
    body: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
    createdByUserId?: string;
  }) {
    return this.repository.create({
      recipientUser: {
        connect: {
          id: input.recipientUserId
        }
      },
      createdByUser: input.createdByUserId ? { connect: { id: input.createdByUserId } } : undefined,
      type: input.type,
      title: input.title,
      body: input.body,
      resourceType: input.resourceType ?? undefined,
      resourceId: input.resourceId ?? undefined,
      metadata: input.metadata as Prisma.InputJsonValue | undefined
    });
  }

  async markRead(id: string) {
    return this.repository.markRead(id);
  }
}
