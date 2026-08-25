import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../errors/http-error.js';

export function requirePermissions(...permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const granted = req.auth?.permissions ?? [];
    const allowed = permissions.every((permission) => granted.includes(permission));

    if (!allowed) {
      next(forbidden('Insufficient permissions'));
      return;
    }

    next();
  };
}
