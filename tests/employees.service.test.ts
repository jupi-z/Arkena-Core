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
    const result = await service.list(
      { role: 'ADMIN' },
      {
        page: 1,
        limit: 20,
        sortOrder: 'desc'
      }
    );

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('scopes manager employee lists to their department', async () => {
    const repository = {
      listEmployees: vi.fn().mockResolvedValue([]),
      countEmployees: vi.fn().mockResolvedValue(0),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn()
    };

    const service = new EmployeesService(repository as any);
    await service.list(
      {
        role: 'MANAGER',
        departmentId: 'dept-1',
        employeeId: 'manager-employee'
      },
      {
        page: 1,
        limit: 20,
        sortOrder: 'desc'
      }
    );

    expect(repository.listEmployees).toHaveBeenCalledWith(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            departmentId: 'dept-1'
          })
        ])
      }),
      0,
      20,
      expect.any(Object)
    );
  });

  it('forbids employees from reading another employee profile', async () => {
    const repository = {
      listEmployees: vi.fn(),
      countEmployees: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: 'emp-2',
        departmentId: 'dept-1'
      }),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn()
    };

    const service = new EmployeesService(repository as any);

    await expect(
      service.getById(
        {
          role: 'EMPLOYEE',
          employeeId: 'emp-1',
          departmentId: 'dept-1'
        },
        'emp-2'
      )
    ).rejects.toThrow(/forbidden/i);
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
