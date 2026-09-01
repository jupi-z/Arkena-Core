import { Prisma, RoleName } from '@prisma/client';
import { DashboardRepository } from './repository.js';

export class DashboardService {
  constructor(private readonly repository = new DashboardRepository()) {}

  private buildScope(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }) {
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(user.role)) {
      return {
        employeeWhere: {},
        attendanceWhere: {},
        documentWhere: {},
        departmentWhere: {}
      };
    }

    if (user.role === 'MANAGER') {
      const departmentId = user.departmentId ?? '__no_department__';
      return {
        employeeWhere: { departmentId } satisfies Prisma.EmployeeWhereInput,
        attendanceWhere: { departmentId } satisfies Prisma.AttendanceRecordWhereInput,
        documentWhere: { employee: { departmentId } } satisfies Prisma.DocumentWhereInput,
        departmentWhere: { id: departmentId } satisfies Prisma.DepartmentWhereInput
      };
    }

    const employeeId = user.employeeId ?? '__no_employee__';
    return {
      employeeWhere: { id: employeeId } satisfies Prisma.EmployeeWhereInput,
      attendanceWhere: { employeeId } satisfies Prisma.AttendanceRecordWhereInput,
      documentWhere: { employeeId } satisfies Prisma.DocumentWhereInput,
      departmentWhere: { employees: { some: { id: employeeId } } } satisfies Prisma.DepartmentWhereInput
    };
  }

  async overview(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }) {
    const [totalEmployees, activeEmployees, inactiveEmployees, departments, todayAttendance, todayLate, recentDocuments] =
      await this.repository.overview(this.buildScope(user));

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departments: departments.map((department) => ({
        id: department.id,
        name: department.name,
        employeeCount: department._count.employees
      })),
      todayAttendance,
      todayLate,
      recentDocuments
    };
  }

  async employees(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }) {
    const scope = this.buildScope(user);
    const [byStatus, byDepartment] = await this.repository.employeeStats({
      employeeWhere: scope.employeeWhere,
      departmentWhere: scope.departmentWhere
    });
    return {
      byStatus,
      byDepartment: byDepartment.map((item) => ({
        id: item.id,
        name: item.name,
        employeeCount: item._count.employees
      }))
    };
  }

  async attendance(user: { role: RoleName; employeeId?: string | null; departmentId?: string | null }) {
    const byStatus = await this.repository.attendanceStats(this.buildScope(user).attendanceWhere);
    return {
      byStatus
    };
  }
}
