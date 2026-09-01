import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

export type RequestContextData = {
  requestId: string;
  ip?: string;
  userAgent?: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextData>();

export function getRequestContext(): RequestContextData | undefined {
  return requestContextStorage.getStore();
}

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  const context = {
    requestId: String(req.id),
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  };

  req.requestContext = context;
  requestContextStorage.run(context, next);
}
