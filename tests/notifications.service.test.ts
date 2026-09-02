import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../src/modules/notifications/service.js';

describe('NotificationsService', () => {
  it('applies search, type and read filters to recipient-scoped lists', async () => {
    const repository = {
      listNotifications: vi.fn().mockResolvedValue([]),
      countNotifications: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      findById: vi.fn(),
      markRead: vi.fn()
    };

    const service = new NotificationsService(repository as any);
    await service.list('user-1', {
      page: 1,
      limit: 20,
      sortOrder: 'desc',
      search: 'policy',
      type: 'INFO',
      read: false
    });

    expect(repository.listNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'user-1',
        type: 'INFO',
        readAt: null,
        OR: expect.any(Array)
      }),
      0,
      20,
      expect.any(Object)
    );
  });

  it('marks only notifications owned by the current user as read', async () => {
    const repository = {
      listNotifications: vi.fn(),
      countNotifications: vi.fn(),
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: 'notification-1',
        recipientUserId: 'user-1',
        title: 'Policy update',
        body: 'Please review',
        readAt: new Date('2026-09-02T00:00:00.000Z')
      }),
      markRead: vi.fn().mockResolvedValue({ count: 1 })
    };

    const service = new NotificationsService(repository as any);
    const result = await service.markRead('notification-1', 'user-1');

    expect(repository.markRead).toHaveBeenCalledWith('notification-1', 'user-1');
    expect(result.id).toBe('notification-1');
  });

  it('does not reveal whether another user notification exists', async () => {
    const repository = {
      listNotifications: vi.fn(),
      countNotifications: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      markRead: vi.fn().mockResolvedValue({ count: 0 })
    };

    const service = new NotificationsService(repository as any);

    await expect(service.markRead('notification-1', 'user-2')).rejects.toThrow(/not found/i);
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
