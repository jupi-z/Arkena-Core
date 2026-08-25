import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../src/config/env.js';
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

  it('removes temporary files when the mime type is not allowed', async () => {
    const repository = {
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    };

    const service = new DocumentsService(repository as any);
    const tempFile = path.resolve(env.UPLOAD_DIR, 'tmp', `blocked-${Date.now()}.exe`);
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.writeFile(tempFile, 'malware');

    await expect(
      service.upload(
        {
          userId: 'user-1',
          role: 'HR',
          employeeId: 'emp-1',
          departmentId: 'dept-1'
        },
        {
          originalname: 'malware.exe',
          mimetype: 'application/x-msdownload',
          path: tempFile,
          size: 7
        } as any,
        {
          employeeId: 'emp-1',
          type: 'OTHER',
          title: 'Blocked file'
        }
      )
    ).rejects.toThrow(/unsupported file type/i);

    await expect(fs.stat(tempFile)).rejects.toThrow();
  });

  it('uploads an allowed document and stores immutable metadata', async () => {
    const repository = {
      listDocuments: vi.fn(),
      countDocuments: vi.fn(),
      findById: vi.fn(),
      create: vi.fn().mockImplementation(async (data) => ({
        id: 'doc-1',
        employeeId: data.employee.connect.id,
        uploadedByUserId: data.uploadedByUser.connect.id,
        type: data.type,
        title: data.title,
        description: data.description,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeInBytes: data.sizeInBytes,
        storageKey: data.storageKey,
        checksum: data.checksum,
        accessLevel: data.accessLevel
      })),
      update: vi.fn()
    };

    const service = new DocumentsService(repository as any);
    const tempFile = path.resolve(env.UPLOAD_DIR, 'tmp', `upload-${Date.now()}.pdf`);
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    await fs.writeFile(tempFile, Buffer.from('%PDF-1.4\n'));

    const result = await service.upload(
      {
        userId: 'user-1',
        role: 'HR',
        employeeId: 'emp-1',
        departmentId: 'dept-1'
      },
      {
        originalname: 'contract.pdf',
        mimetype: 'application/pdf',
        path: tempFile,
        size: 10
      } as any,
      {
        employeeId: 'emp-1',
        type: 'CONTRACT',
        title: 'Employment contract',
        description: 'Signed version'
      }
    );

    expect(repository.create).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      id: 'doc-1',
      employeeId: 'emp-1',
      uploadedByUserId: 'user-1',
      type: 'CONTRACT',
      title: 'Employment contract',
      description: 'Signed version',
      originalName: 'contract.pdf',
      mimeType: 'application/pdf',
      sizeInBytes: 10,
      accessLevel: 'PRIVATE'
    });
    expect(result.storageKey).toMatch(/\.pdf$/);
    await expect(fs.stat(tempFile)).rejects.toThrow();
    await expect(fs.stat(path.resolve(env.UPLOAD_DIR, result.storageKey))).resolves.toBeDefined();
  });
});
