import type { RoleName, User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: RoleName;
        permissions: string[];
        tokenId: string;
        email: string;
        employeeId?: string | null;
        departmentId?: string | null;
      };
      currentUser?: User & { employee?: unknown };
      requestContext?: {
        requestId?: string;
        ip?: string;
        userAgent?: string;
      };
    }
  }
}

export {};
