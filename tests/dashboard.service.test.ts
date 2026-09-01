import { describe, expect, it, vi } from 'vitest';
import { DashboardService } from '../src/modules/dashboard/service.js';

describe('DashboardService', () => {
  it('scopes manager overview statistics to their department', async () => {
    const repository = {
      overview: vi.fn().mockResolvedValue([
        2,
        2,
        0,
        [{ id: 'dept-1', name: 'Operations', _count: { employees: 2 } }],
        1,
        0,
        []
      ]),
      employeeStats: vi.fn(),
      attendanceStats: vi.fn()
    };

    const service = new DashboardService(repository as any);
    await service.overview({
      role: 'MANAGER',
      employeeId: 'manager-employee',
      departmentId: 'dept-1'
    });

    expect(repository.overview).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeWhere: { departmentId: 'dept-1' },
        attendanceWhere: { departmentId: 'dept-1' },
        documentWhere: { employee: { departmentId: 'dept-1' } },
        departmentWhere: { id: 'dept-1' }
      })
    );
  });

  it('scopes employee attendance dashboard to their own employee id', async () => {
    const repository = {
      overview: vi.fn(),
      employeeStats: vi.fn(),
      attendanceStats: vi.fn().mockResolvedValue([])
    };

    const service = new DashboardService(repository as any);
    await service.attendance({
      role: 'EMPLOYEE',
      employeeId: 'emp-1',
      departmentId: 'dept-1'
    });

    expect(repository.attendanceStats).toHaveBeenCalledWith({
      employeeId: 'emp-1'
    });
  });

  it('keeps admin dashboard statistics unscoped', async () => {
    const repository = {
      overview: vi.fn(),
      employeeStats: vi.fn().mockResolvedValue([[], []]),
      attendanceStats: vi.fn()
    };

    const service = new DashboardService(repository as any);
    await service.employees({
      role: 'ADMIN'
    });

    expect(repository.employeeStats).toHaveBeenCalledWith({
      employeeWhere: {},
      departmentWhere: {}
    });
  });
});
