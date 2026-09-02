import { describe, expect, it } from 'vitest';
import { auditListQuerySchema } from '../src/modules/audit/types.js';
import { employeeListQuerySchema } from '../src/modules/employees/types.js';
import { notificationListQuerySchema } from '../src/modules/notifications/types.js';
import { userListQuerySchema } from '../src/modules/users/types.js';

describe('list query schemas', () => {
  it('preserves supported filters at the validation boundary', () => {
    expect(employeeListQuerySchema.parse({ departmentId: 'dept-1', status: 'ACTIVE' })).toMatchObject({
      departmentId: 'dept-1',
      status: 'ACTIVE'
    });
    expect(userListQuerySchema.parse({ status: 'SUSPENDED' }).status).toBe('SUSPENDED');
    expect(auditListQuerySchema.parse({ resource: 'employee', action: 'UPDATE' })).toMatchObject({
      resource: 'employee',
      action: 'UPDATE'
    });
    expect(notificationListQuerySchema.parse({ type: 'INFO', read: 'false' })).toMatchObject({
      type: 'INFO',
      read: false
    });
  });
});
