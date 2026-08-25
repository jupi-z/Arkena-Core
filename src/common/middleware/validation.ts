import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type RequestSchema = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validateRequest(schema: RequestSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schema.body) {
      req.body = schema.body.parse(req.body);
    }
    if (schema.query) {
      Object.defineProperty(req, 'query', {
        value: schema.query.parse(req.query),
        configurable: true,
        enumerable: true,
        writable: true
      });
    }
    if (schema.params) {
      Object.defineProperty(req, 'params', {
        value: schema.params.parse(req.params),
        configurable: true,
        enumerable: true,
        writable: true
      });
    }

    next();
  };
}
