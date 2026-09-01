import { Prisma } from '@prisma/client';
import { notFound } from '../../common/errors/http-error.js';
import { recordAudit } from '../../common/audit/record-audit.js';
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

  async create(input: {
    recipientUserId: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'SYSTEM';
    title: string;
    body: string;
    resourceType?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
    createdByUserId?: string;
  }) {
    const created = await this.repository.create({
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

    void recordAudit({
      actorUserId: input.createdByUserId,
      action: 'CREATE',
      resource: 'notification',
      resourceId: created.id
    });

    return created;
  }

  async markRead(id: string, userId: string) {
    const result = await this.repository.markRead(id, userId);
    if (result.count === 0) {
      throw notFound('Notification not found');
    }

    const updated = await this.repository.findById(id);
    if (!updated) {
      throw notFound('Notification not found');
    }

    void recordAudit({
      actorUserId: userId,
      action: 'UPDATE',
      resource: 'notification',
      resourceId: id,
      metadata: {
        read: true
      }
    });
    return updated;
  }
}
