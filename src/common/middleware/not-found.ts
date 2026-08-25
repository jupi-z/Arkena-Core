import type { RequestHandler } from 'express';
import { notFound } from '../errors/http-error.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(notFound('Route not found'));
};
