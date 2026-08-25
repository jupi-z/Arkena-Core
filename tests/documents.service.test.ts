import { describe, expect, it, vi } from 'vitest';
import { DocumentsService } from '../src/modules/documents/service.js';

describe('DocumentsService', () => {
  it('rejects uploads from unauthorized employees', async () => {
    const repository = {
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    };

    const service = new DocumentsService(repository as any);

    await expect(
      service.upload(
        {
          userId: 'user-1',
          role: 'EMPLOYEE',
          employeeId: 'emp-1',
          departmentId: 'dept-1'
        },
        {
          originalname: 'contract.pdf',
          mimetype: 'application/pdf',
          path: 'uploads-test/tmp/test.pdf',
          size: 128
        } as any,
        {
          employeeId: 'emp-2',
          type: 'CONTRACT',
          title: 'Contract'
        }
      )
    ).rejects.toThrow(/forbidden/i);
  });
});
