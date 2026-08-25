import { describe, expect, it, vi } from 'vitest';
import { EmployeesService } from '../src/modules/employees/service.js';

describe('EmployeesService', () => {
  it('returns paginated employee lists with repository totals', async () => {
    const repository = {
      listEmployees: vi.fn().mockResolvedValue([{ id: 'emp-1' }]),
      countEmployees: vi.fn().mockResolvedValue(1),
      findById: vi.fn().mockResolvedValue({ id: 'emp-1' }),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn()
    };

    const service = new EmployeesService(repository as any);
    const result = await service.list({
      page: 1,
      limit: 20,
      sortOrder: 'desc'
    });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
