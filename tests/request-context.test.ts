import { describe, expect, it, vi } from 'vitest';
import { enrichAuditContext } from '../src/common/audit/record-audit.js';
import { getRequestContext, requestContext } from '../src/common/middleware/request-context.js';

describe('requestContext', () => {
  it('keeps request metadata available across async audit work', async () => {
    const req = {
      id: 'request-1',
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('Vitest Agent')
    };
    let seenContext: ReturnType<typeof getRequestContext>;
    let auditPayload: ReturnType<typeof enrichAuditContext> | undefined;

    await new Promise<void>((resolve, reject) => {
      requestContext(req as any, {} as any, async (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        await Promise.resolve();
        seenContext = getRequestContext();
        auditPayload = enrichAuditContext({
          action: 'CREATE',
          resource: 'employee',
          resourceId: 'employee-1'
        });
        resolve();
      });
    });

    expect(seenContext).toEqual({
      requestId: 'request-1',
      ip: '127.0.0.1',
      userAgent: 'Vitest Agent'
    });
    expect(auditPayload).toMatchObject({
      ip: '127.0.0.1',
      userAgent: 'Vitest Agent'
    });
  });
});
