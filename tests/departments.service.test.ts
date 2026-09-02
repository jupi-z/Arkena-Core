import { describe, expect, it, vi } from 'vitest';
import { DepartmentsService } from '../src/modules/departments/service.js';

describe('DepartmentsService', () => {
  it('creates departments with normalized pagination support', async () => {
    const repository = {
      listDepartments: vi.fn().mockResolvedValue([{ id: 'dept-1' }]),
      countDepartments: vi.fn().mockResolvedValue(1),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn()
    };

    const service = new DepartmentsService(repository as any);
    const result = await service.list({
      page: 2,
      limit: 10,
      search: 'ops',
      sortOrder: 'asc',
      status: 'ACTIVE'
    });

    expect(repository.listDepartments).toHaveBeenCalledWith(
      expect.objectContaining({
        OR: expect.any(Array)
      }),
      10,
      10,
      expect.any(Object)
    );
    expect(repository.listDepartments).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      10,
      10,
      expect.any(Object)
    );
    expect(result.total).toBe(1);
  });

  it('loads current department before updates for audit-safe mutations', async () => {
    const before = {
      id: 'dept-1',
      code: 'OPS',
      name: 'Operations'
    };
    const updated = {
      ...before,
      name: 'Operations North'
    };
    const repository = {
      listDepartments: vi.fn(),
      countDepartments: vi.fn(),
      findById: vi.fn().mockResolvedValue(before),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(updated),
      remove: vi.fn()
    };

    const service = new DepartmentsService(repository as any);
    const result = await service.update('dept-1', { name: 'Operations North' }, 'admin-1');

    expect(repository.findById).toHaveBeenCalledWith('dept-1');
    expect(repository.update).toHaveBeenCalledWith('dept-1', { name: 'Operations North' });
    expect(result.name).toBe('Operations North');
  });
});
