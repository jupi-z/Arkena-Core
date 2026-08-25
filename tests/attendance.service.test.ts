import { describe, expect, it, vi } from 'vitest';
import { AttendanceService } from '../src/modules/attendance/service.js';

describe('AttendanceService', () => {
  it('prevents duplicate attendance records for the same day', async () => {
    const repository = {
      findByUnique: vi.fn().mockResolvedValue({ id: 'att-1' }),
      create: vi.fn(),
      listAttendance: vi.fn(),
      countAttendance: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      summary: vi.fn()
    };

    const service = new AttendanceService(repository as any);

    await expect(
      service.create(
        {
          employeeId: 'emp-1',
          attendanceDate: '2026-08-25T00:00:00.000Z',
          status: 'PRESENT'
        },
        'user-1'
      )
    ).rejects.toThrow(/already exists/i);
  });

  it('creates an attendance record when no duplicate exists', async () => {
    const repository = {
      findByUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'att-1' }),
      listAttendance: vi.fn(),
      countAttendance: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      summary: vi.fn()
    };

    const service = new AttendanceService(repository as any);
    const result = await service.create(
      {
        employeeId: 'emp-1',
        attendanceDate: '2026-08-25T00:00:00.000Z',
        status: 'PRESENT',
        comment: 'On time'
      },
      'user-1'
    );

    expect(repository.create).toHaveBeenCalledOnce();
    expect(result).toEqual({ id: 'att-1' });
  });

  it('builds a filtered summary with presence rate and department breakdown', async () => {
    const repository = {
      findByUnique: vi.fn(),
      create: vi.fn(),
      listAttendance: vi.fn(),
      countAttendance: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      summary: vi.fn().mockResolvedValue([
        8,
        2,
        1,
        11,
        [
          { departmentId: 'dept-1', status: 'PRESENT', _count: { _all: 5 } },
          { departmentId: 'dept-1', status: 'ABSENT', _count: { _all: 1 } },
          { departmentId: 'dept-2', status: 'LATE', _count: { _all: 1 } },
          { departmentId: null, status: 'PRESENT', _count: { _all: 3 } }
        ]
      ])
    };

    const service = new AttendanceService(repository as any);
    const result = await service.summary({
      departmentId: 'dept-1',
      employeeId: 'emp-1',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z'
    });

    expect(repository.summary).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 'dept-1',
        employeeId: 'emp-1',
        attendanceDate: expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(Date)
        })
      })
    );
    expect(result).toMatchObject({
      present: 8,
      absent: 2,
      late: 1,
      total: 11,
      presenceRate: 72.73,
      byDepartment: {
        'dept-1': {
          present: 5,
          absent: 1,
          late: 0,
          total: 6
        },
        'dept-2': {
          present: 0,
          absent: 0,
          late: 1,
          total: 1
        },
        unassigned: {
          present: 3,
          absent: 0,
          late: 0,
          total: 3
        }
      }
    });
  });
});
