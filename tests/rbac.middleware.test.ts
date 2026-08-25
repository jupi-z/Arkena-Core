import { describe, expect, it, vi } from 'vitest';
import { requirePermissions } from '../src/common/middleware/rbac.js';

describe('requirePermissions', () => {
  it('allows a request when all permissions are present', () => {
    const middleware = requirePermissions('employee:read', 'dashboard:read');
    const req = {
      auth: {
        permissions: ['employee:read', 'dashboard:read']
      }
    } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks a request when permissions are missing', () => {
    const middleware = requirePermissions('employee:delete');
    const req = {
      auth: {
        permissions: ['employee:read']
      }
    } as any;
    const res = {} as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({
      statusCode: 403
    });
  });
});
