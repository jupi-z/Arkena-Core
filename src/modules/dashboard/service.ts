import { DashboardRepository } from './repository.js';

export class DashboardService {
  constructor(private readonly repository = new DashboardRepository()) {}

  async overview() {
    const [totalEmployees, activeEmployees, inactiveEmployees, departments, todayAttendance, todayLate, recentDocuments] =
      await this.repository.overview();

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

  async employees() {
    const [byStatus, byDepartment] = await this.repository.employeeStats();
    return {
      byStatus,
      byDepartment: byDepartment.map((item) => ({
        id: item.id,
        name: item.name,
        employeeCount: item._count.employees
      }))
    };
  }

  async attendance() {
    const byStatus = await this.repository.attendanceStats();
    return {
      byStatus
    };
  }
}
