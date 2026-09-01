export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = 'HTTP_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, 'BAD_REQUEST', details);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = 'Forbidden') => new HttpError(403, message, 'FORBIDDEN');
export const conflict = (message = 'Conflict') => new HttpError(409, message, 'CONFLICT');
export const notFound = (message = 'Not found') => new HttpError(404, message, 'NOT_FOUND');
