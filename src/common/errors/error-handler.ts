import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from './http-error.js';
import { logger } from '../logger/logger.js';

function isPrismaKnownRequestError(error: unknown): error is { code: string; meta?: Record<string, unknown>; message: string } {
  return typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code?: unknown }).code === 'string';
}

function isMulterError(error: unknown): error is { name: string; code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'MulterError' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.flatten(),
        requestId: req.requestContext?.requestId
      }
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: req.requestContext?.requestId
      }
    });
  }

  if (isMulterError(error)) {
    const fileTooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(fileTooLarge ? 413 : 400).json({
      success: false,
      error: {
        code: fileTooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
        message: fileTooLarge ? 'Uploaded file is too large' : 'File upload failed',
        requestId: req.requestContext?.requestId
      }
    });
  }

  if (isPrismaKnownRequestError(error)) {
    const code = error.code === 'P2002' ? 409 : 400;
    return res.status(code).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: error.code === 'P2002' ? 'Resource already exists' : 'Database operation failed',
        requestId: req.requestContext?.requestId
      }
    });
  }

  logger.error({
    err: error,
    requestId: req.requestContext?.requestId,
    path: req.originalUrl,
    method: req.method
  }, 'Unhandled request error');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      requestId: req.requestContext?.requestId
    }
  });
};
