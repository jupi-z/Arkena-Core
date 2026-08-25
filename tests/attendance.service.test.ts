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
});
