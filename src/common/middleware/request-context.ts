import type { NextFunction, Request, Response } from 'express';

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  req.requestContext = {
    ip: req.ip,
    userAgent: req.get('user-agent') ?? undefined
  };
  next();
}
