import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from '../src/modules/notifications/service.js';

describe('NotificationsService', () => {
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
