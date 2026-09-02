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
          userId: 'user-1',
          role: 'HR',
          employeeId: 'emp-1',
          departmentId: 'dept-1'
        },
        {
          employeeId: 'emp-1',
          attendanceDay: '2026-08-25',
          status: 'PRESENT'
        }
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
        userId: 'user-1',
        role: 'HR',
        employeeId: 'emp-1',
        departmentId: 'dept-1'
      },
      {
        employeeId: 'emp-1',
        attendanceDay: '2026-08-25',
        status: 'PRESENT',
        comment: 'On time'
      }
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
    const result = await service.summary(
      { role: 'ADMIN' },
      {
        departmentId: 'dept-1',
        employeeId: 'emp-1',
        from: '2026-08-01',
        to: '2026-08-31'
      }
    );

    expect(repository.summary).toHaveBeenCalledWith(
      expect.objectContaining({
        departmentId: 'dept-1',
        employeeId: 'emp-1',
        attendanceDay: expect.objectContaining({
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

  it('scopes employee attendance lists to their own employee id', async () => {
    const repository = {
      findByUnique: vi.fn(),
      create: vi.fn(),
      listAttendance: vi.fn().mockResolvedValue([]),
      countAttendance: vi.fn().mockResolvedValue(0),
      findById: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      summary: vi.fn()
    };

    const service = new AttendanceService(repository as any);
    await service.list(
      {
        role: 'EMPLOYEE',
        employeeId: 'emp-1',
        departmentId: 'dept-1'
      },
      {
        page: 1,
        limit: 20,
        sortOrder: 'desc'
      }
    );

    expect(repository.listAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        AND: expect.arrayContaining([
          expect.objectContaining({
            employeeId: 'emp-1'
          })
        ])
      }),
      0,
      20,
      expect.any(Object)
    );
  });

  it('forbids managers from creating attendance outside their department', async () => {
    const repository = {
      findByUnique: vi.fn(),
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
          userId: 'user-1',
          role: 'MANAGER',
          employeeId: 'manager-employee',
          departmentId: 'dept-1'
        },
        {
          employeeId: 'emp-2',
          departmentId: 'dept-2',
          attendanceDay: '2026-08-25',
          status: 'PRESENT'
        }
      )
    ).rejects.toThrow(/forbidden/i);
  });
  it('rejects check-out before check-in', async () => {
    const repository = {
      findByUnique: vi.fn().mockResolvedValue(null),
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
        { userId: 'user-1', role: 'HR' },
        {
          employeeId: 'emp-1',
          attendanceDay: '2026-08-25',
          status: 'PRESENT',
          checkInAt: '2026-08-25T17:00:00.000Z',
          checkOutAt: '2026-08-25T08:00:00.000Z'
        }
      )
    ).rejects.toThrow(/on or after check-in/i);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('updates the same attendance day without treating the current record as a duplicate', async () => {
    const record = {
      id: 'att-1',
      employeeId: 'emp-1',
      departmentId: 'dept-1',
      attendanceDay: new Date('2026-08-25T00:00:00.000Z'),
      checkInAt: null,
      checkOutAt: null
    };
    const repository = {
      findByUnique: vi.fn(),
      create: vi.fn(),
      listAttendance: vi.fn(),
      countAttendance: vi.fn(),
      findById: vi.fn().mockResolvedValue(record),
      update: vi.fn().mockResolvedValue({ ...record, status: 'PRESENT' }),
      remove: vi.fn(),
      summary: vi.fn()
    };

    const service = new AttendanceService(repository as any);
    await service.update({ userId: 'user-1', role: 'HR' }, 'att-1', {
      attendanceDay: '2026-08-25',
      status: 'PRESENT'
    });

    expect(repository.findByUnique).toHaveBeenCalledWith('emp-1', expect.any(Date), 'att-1');
    expect(repository.update).toHaveBeenCalled();
  });

  it('rejects an update that moves a record onto another attendance day record', async () => {
    const repository = {
      findByUnique: vi.fn().mockResolvedValue({ id: 'att-2' }),
      create: vi.fn(),
      listAttendance: vi.fn(),
      countAttendance: vi.fn(),
      findById: vi.fn().mockResolvedValue({
        id: 'att-1',
        employeeId: 'emp-1',
        departmentId: 'dept-1',
        attendanceDay: new Date('2026-08-25T00:00:00.000Z'),
        checkInAt: null,
        checkOutAt: null
      }),
      update: vi.fn(),
      remove: vi.fn(),
      summary: vi.fn()
    };

    const service = new AttendanceService(repository as any);
    await expect(
      service.update({ userId: 'user-1', role: 'HR' }, 'att-1', {
        attendanceDay: '2026-08-26'
      })
    ).rejects.toThrow(/already exists/i);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
