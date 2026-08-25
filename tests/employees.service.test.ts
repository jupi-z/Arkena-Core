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

  it('creates an employee with normalized values', async () => {
    const repository = {
      listEmployees: vi.fn(),
      countEmployees: vi.fn(),
      findById: vi.fn().mockResolvedValue({ id: 'emp-1' }),
      create: vi.fn().mockResolvedValue({
        id: 'emp-1',
        employeeNumber: 'EMP-01'
      }),
      update: vi.fn(),
      archive: vi.fn()
    };

    const service = new EmployeesService(repository as any);
    const result = await service.create({
      employeeNumber: 'EMP-01',
      firstName: 'Amina',
      lastName: 'Diallo',
      email: 'AMINA@EXAMPLE.COM',
      hireDate: '2026-08-25T00:00:00.000Z',
      status: 'ACTIVE'
    });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'amina@example.com'
    }));
    expect(result).toEqual({
      id: 'emp-1',
      employeeNumber: 'EMP-01'
    });
  });
});
