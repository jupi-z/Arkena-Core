import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/common/errors/error-handler.js';

function makeResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };

  return res;
}

describe('errorHandler', () => {
  it('maps Multer file-size errors to a standardized 413 response', () => {
    const req = {
      requestContext: {
        requestId: 'request-1'
      }
    };
    const res = makeResponse();
    const error = {
      name: 'MulterError',
      code: 'LIMIT_FILE_SIZE'
    };

    errorHandler(error, req as any, res as any, vi.fn());

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'Uploaded file is too large',
        requestId: 'request-1'
      }
    });
  });
});
