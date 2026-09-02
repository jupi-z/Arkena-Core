import type { RoleName } from '@prisma/client';

export type DashboardUserScope = {
  role: RoleName;
  employeeId?: string | null;
  departmentId?: string | null;
};
