import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { verifyAccessToken } from '../security/tokens.js';
import { unauthorized } from '../errors/http-error.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.header('authorization');

  if (!header || !header.startsWith('Bearer ')) {
    next(unauthorized());
    return;
  }

  const token = header.slice(7);

  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: true
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      next(unauthorized());
      return;
    }

    req.auth = {
      userId: user.id,
      role: user.role,
      permissions: payload.permissions,
      tokenId: payload.jti,
      email: user.email,
      employeeId: user.employee?.id ?? null,
      departmentId: user.employee?.departmentId ?? null
    };
    req.currentUser = user;
    next();
  } catch {
    next(unauthorized());
  }
}
