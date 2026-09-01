import bcrypt from 'bcrypt';
import { PrismaClient, AuditAction, EmployeeStatus, NotificationType, RoleName, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const permissionCatalog = [
  'user:create',
  'user:read',
  'user:update',
  'user:delete',
  'role:assign',
  'employee:create',
  'employee:read',
  'employee:update',
  'employee:delete',
  'employee:archive',
  'department:create',
  'department:read',
  'department:update',
  'department:delete',
  'attendance:create',
  'attendance:read',
  'attendance:update',
  'attendance:delete',
  'attendance:summary',
  'document:upload',
  'document:read',
  'document:delete',
  'document:download',
  'notification:create',
  'notification:read',
  'audit:read',
  'dashboard:read',
  'file:upload'
] as const;

const rolePermissions: Record<RoleName, readonly string[]> = {
  SUPER_ADMIN: permissionCatalog,
  ADMIN: [
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'employee:create',
    'employee:read',
    'employee:update',
    'employee:delete',
    'employee:archive',
    'department:create',
    'department:read',
    'department:update',
    'department:delete',
    'attendance:read',
    'attendance:summary',
    'document:read',
    'document:download',
    'document:delete',
    'notification:create',
    'notification:read',
    'audit:read',
    'dashboard:read'
  ],
  HR: [
    'employee:create',
    'employee:read',
    'employee:update',
    'employee:archive',
    'attendance:create',
    'attendance:read',
    'attendance:update',
    'attendance:summary',
    'document:upload',
    'document:read',
    'document:download',
    'notification:create',
    'notification:read',
    'dashboard:read'
  ],
  MANAGER: [
    'employee:read',
    'attendance:read',
    'attendance:summary',
    'document:read',
    'document:download',
    'notification:read',
    'dashboard:read'
  ],
  EMPLOYEE: [
    'employee:read',
    'attendance:read',
    'document:read',
    'document:download',
    'notification:read'
  ]
};

async function main() {
  const permissions = await Promise.all(
    permissionCatalog.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, description: code.replace(':', ' ').toUpperCase() }
      })
    )
  );

  for (const [role, codes] of Object.entries(rolePermissions) as [RoleName, readonly string[]][]) {
    for (const code of codes) {
      const permission = permissions.find((entry) => entry.code === code);
      if (!permission) {
        continue;
      }

      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          role,
          permissionId: permission.id
        }
      });
    }
  }

  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'HQ' },
      update: {},
      create: {
        code: 'HQ',
        name: 'Headquarters',
        description: 'Corporate headquarters',
        status: EmployeeStatus.ACTIVE
      }
    }),
    prisma.department.upsert({
      where: { code: 'HR' },
      update: {},
      create: {
        code: 'HR',
        name: 'Human Resources',
        description: 'People operations',
        status: EmployeeStatus.ACTIVE
      }
    }),
    prisma.department.upsert({
      where: { code: 'OPS' },
      update: {},
      create: {
        code: 'OPS',
        name: 'Operations',
        description: 'Operational delivery',
        status: EmployeeStatus.ACTIVE
      }
    })
  ]);

  const adminPassword = await bcrypt.hash(process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? 'admin@arkena.local' },
    update: {
      passwordHash: adminPassword,
      role: RoleName.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      firstName: process.env.DEFAULT_SUPER_ADMIN_FIRST_NAME ?? 'Super',
      lastName: process.env.DEFAULT_SUPER_ADMIN_LAST_NAME ?? 'Admin',
      phone: process.env.DEFAULT_SUPER_ADMIN_PHONE ?? '+0000000000'
    },
    create: {
      email: process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? 'admin@arkena.local',
      passwordHash: adminPassword,
      role: RoleName.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      firstName: process.env.DEFAULT_SUPER_ADMIN_FIRST_NAME ?? 'Super',
      lastName: process.env.DEFAULT_SUPER_ADMIN_LAST_NAME ?? 'Admin',
      phone: process.env.DEFAULT_SUPER_ADMIN_PHONE ?? '+0000000000'
    }
  });

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@arkena.local' },
    update: {},
    create: {
      email: 'hr@arkena.local',
      passwordHash: await bcrypt.hash('HrPass123!', 12),
      role: RoleName.HR,
      status: UserStatus.ACTIVE,
      firstName: 'Hannah',
      lastName: 'Reed',
      phone: '+1000000002',
      jobTitle: 'HR Lead'
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@arkena.local' },
    update: {},
    create: {
      email: 'manager@arkena.local',
      passwordHash: await bcrypt.hash('Manager123!', 12),
      role: RoleName.MANAGER,
      status: UserStatus.ACTIVE,
      firstName: 'Mason',
      lastName: 'Green',
      phone: '+1000000003',
      jobTitle: 'Operations Manager'
    }
  });

  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@arkena.local' },
    update: {},
    create: {
      email: 'employee@arkena.local',
      passwordHash: await bcrypt.hash('Employee123!', 12),
      role: RoleName.EMPLOYEE,
      status: UserStatus.ACTIVE,
      firstName: 'Amina',
      lastName: 'Diallo',
      phone: '+1000000004',
      jobTitle: 'Operations Specialist'
    }
  });

  const employees = await Promise.all([
    prisma.employee.upsert({
      where: { email: 'admin.employee@arkena.local' },
      update: { userId: adminUser.id },
      create: {
        employeeNumber: 'EMP-0001',
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin.employee@arkena.local',
        phone: '+1000000001',
        jobTitle: 'System Administrator',
        hireDate: new Date('2026-01-05T00:00:00.000Z'),
        status: EmployeeStatus.ACTIVE,
        departmentId: departments[0].id,
        userId: adminUser.id
      }
    }),
    prisma.employee.upsert({
      where: { email: 'hr.employee@arkena.local' },
      update: { userId: hrUser.id },
      create: {
        employeeNumber: 'EMP-0002',
        firstName: 'Hannah',
        lastName: 'Reed',
        email: 'hr.employee@arkena.local',
        phone: '+1000000002',
        jobTitle: 'HR Lead',
        hireDate: new Date('2026-02-01T00:00:00.000Z'),
        status: EmployeeStatus.ACTIVE,
        departmentId: departments[1].id,
        userId: hrUser.id
      }
    }),
    prisma.employee.upsert({
      where: { email: 'manager.employee@arkena.local' },
      update: { userId: managerUser.id },
      create: {
        employeeNumber: 'EMP-0003',
        firstName: 'Mason',
        lastName: 'Green',
        email: 'manager.employee@arkena.local',
        phone: '+1000000003',
        jobTitle: 'Operations Manager',
        hireDate: new Date('2026-02-10T00:00:00.000Z'),
        status: EmployeeStatus.ACTIVE,
        departmentId: departments[2].id,
        userId: managerUser.id
      }
    }),
    prisma.employee.upsert({
      where: { email: 'employee.employee@arkena.local' },
      update: { userId: employeeUser.id },
      create: {
        employeeNumber: 'EMP-0004',
        firstName: 'Amina',
        lastName: 'Diallo',
        email: 'employee.employee@arkena.local',
        phone: '+1000000004',
        jobTitle: 'Operations Specialist',
        hireDate: new Date('2026-03-15T00:00:00.000Z'),
        status: EmployeeStatus.ACTIVE,
        departmentId: departments[2].id,
        managerId: null,
        userId: employeeUser.id
      }
    })
  ]);

  await prisma.attendanceRecord.upsert({
    where: {
      employeeId_attendanceDate: {
        employeeId: employees[3].id,
        attendanceDate: new Date('2026-08-24T00:00:00.000Z')
      }
    },
    update: {
      status: 'PRESENT'
    },
    create: {
      employeeId: employees[3].id,
      departmentId: departments[2].id,
      attendanceDate: new Date('2026-08-24T00:00:00.000Z'),
      status: 'PRESENT',
      checkInAt: new Date('2026-08-24T08:58:00.000Z'),
      checkOutAt: new Date('2026-08-24T17:31:00.000Z'),
      comment: 'Seeded attendance',
      recordedByUserId: adminUser.id,
      source: 'seed'
    }
  });

  await prisma.notification.upsert({
    where: { id: 'seed-notification-1' },
    update: {},
    create: {
      id: 'seed-notification-1',
      recipientUserId: employeeUser.id,
      createdByUserId: adminUser.id,
      type: NotificationType.SYSTEM,
      title: 'Welcome to Arkena Core',
      body: 'Your account is ready for testing.',
      resourceType: 'SYSTEM',
      resourceId: 'seed'
    }
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: AuditAction.CREATE,
      resource: 'seed',
      resourceId: 'initial',
      metadata: {
        note: 'Initial seed completed'
      }
    }
  });

  console.log('Seed completed', {
    permissions: permissions.length,
    departments: departments.length,
    employees: employees.length
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
