import { describe, expect, it, vi } from 'vitest';
import { AuditService } from '../src/modules/audit/service.js';

describe('AuditService', () => {
  it('applies resource and action filters to audit lists', async () => {
    const repository = {
      listAuditLogs: vi.fn().mockResolvedValue([]),
      countAuditLogs: vi.fn().mockResolvedValue(0),
      create: vi.fn()
    };

    const service = new AuditService(repository as any);
    await service.list({
      page: 2,
      limit: 10,
      sortOrder: 'asc',
      resource: 'employee',
      action: 'UPDATE'
    });

    expect(repository.listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'employee',
        action: 'UPDATE'
      }),
      10,
      10,
      expect.any(Object)
    );
  });
});
