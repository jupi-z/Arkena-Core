import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const runReleaseE2e = process.env.RUN_RELEASE_E2E === 'true';
const e2eDescribe = runReleaseE2e ? describe : describe.skip;
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3002';
const runId = randomUUID().slice(0, 8).toUpperCase();
const adminEmail = process.env.DEFAULT_SUPER_ADMIN_EMAIL ?? 'admin@arkena.local';
const adminPassword = process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
const currentDay = new Date().toISOString().slice(0, 10);

type Session = {
  accessToken: string;
  refreshToken: string;
};

type CreatedRecord = {
  attendanceIds: string[];
};

type DashboardOverview = {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  departments: Array<{
    id: string;
    name: string;
    employeeCount: number;
  }>;
  todayAttendance: number;
  todayLate: number;
  recentDocuments: Array<{
    id: string;
    employeeId: string;
    type: string;
    title: string;
  }>;
};

const state = {
  adminSession: null as Session | null,
  created: {
    attendanceIds: [] as string[]
  } as CreatedRecord,
  baselineOverview: null as DashboardOverview | null,
  departmentId: '',
  employeeId: '',
  documentId: ''
};

async function ensureHealthyBase() {
  const liveResponse = await request(baseUrl).get('/health/live');
  expect(liveResponse.status).toBe(200);

  const readyResponse = await request(baseUrl).get('/health/ready');
  expect(readyResponse.status).toBe(200);
}

async function bootstrapAdminSession() {
  const loginResponse = await request(baseUrl).post('/auth/login').send({
    email: adminEmail,
    password: adminPassword
  });

  if (loginResponse.status === 200) {
    expect(loginResponse.body).toMatchObject({
      success: true,
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      }
    });

    return loginResponse.body.data as Session;
  }

  expect(loginResponse.status).toBe(401);

  const bootstrapResponse = await request(baseUrl).post('/auth/register-admin').send({
    email: adminEmail,
    password: adminPassword,
    firstName: 'Super',
    lastName: 'Admin',
    phone: '+0000000000'
  });

  expect(bootstrapResponse.status).toBe(201);
  expect(bootstrapResponse.body).toMatchObject({
    success: true,
    data: {
      accessToken: expect.any(String),
      refreshToken: expect.any(String)
    }
  });

  return bootstrapResponse.body.data as Session;
}

e2eDescribe('Release e2e', () => {
  beforeAll(async () => {
    await ensureHealthyBase();
    state.adminSession = await bootstrapAdminSession();

    const refreshResponse = await request(baseUrl).post('/auth/refresh').send({
      refreshToken: state.adminSession.refreshToken
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body).toMatchObject({
      success: true,
      data: {
        accessToken: expect.any(String),
        refreshToken: expect.any(String)
      }
    });

    state.adminSession = refreshResponse.body.data as Session;

    const meResponse = await request(baseUrl)
      .get('/auth/me')
      .set('Authorization', `Bearer ${state.adminSession.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toMatchObject({
      success: true,
      data: {
        email: adminEmail
      }
    });

    const baselineResponse = await request(baseUrl)
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${state.adminSession.accessToken}`);

    expect(baselineResponse.status).toBe(200);
    state.baselineOverview = baselineResponse.body.data as DashboardOverview;
  });

  afterAll(async () => {
    if (!state.adminSession) {
      return;
    }

    if (state.documentId) {
      await request(baseUrl)
        .delete(`/documents/${state.documentId}`)
        .set('Authorization', `Bearer ${state.adminSession.accessToken}`)
        .catch(() => undefined);
    }

    for (const attendanceId of state.created.attendanceIds.reverse()) {
      await request(baseUrl)
        .delete(`/attendance/${attendanceId}`)
        .set('Authorization', `Bearer ${state.adminSession.accessToken}`)
        .catch(() => undefined);
    }

    if (state.employeeId) {
      await request(baseUrl)
        .post(`/employees/${state.employeeId}/archive`)
        .set('Authorization', `Bearer ${state.adminSession.accessToken}`)
        .send({ archivedAt: new Date().toISOString() })
        .catch(() => undefined);
    }

    if (state.departmentId) {
      await request(baseUrl)
        .delete(`/departments/${state.departmentId}`)
        .set('Authorization', `Bearer ${state.adminSession.accessToken}`)
        .catch(() => undefined);
    }

    await request(baseUrl)
      .post('/auth/logout')
      .send({ refreshToken: state.adminSession.refreshToken })
      .catch(() => undefined);
  });

  it('returns attendance summary and dashboard statistics from real API data', async () => {
    const departmentResponse = await request(baseUrl)
      .post('/departments')
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`)
      .send({
        code: `OPS${runId}`,
        name: `Operations ${runId}`,
        description: 'Release validation department'
      });

    expect(departmentResponse.status).toBe(201);
    state.departmentId = departmentResponse.body.data.id as string;

    const employeeResponse = await request(baseUrl)
      .post('/employees')
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`)
      .send({
        employeeNumber: `EMP-${runId}`,
        firstName: 'Amina',
        lastName: 'Diallo',
        email: `employee-${runId}@arkena.test`,
        phone: '+1000000099',
        jobTitle: 'Operations Specialist',
        hireDate: new Date(`${currentDay}T08:00:00.000Z`).toISOString(),
        status: 'ACTIVE',
        departmentId: state.departmentId,
        notes: 'Created by release e2e'
      });

    expect(employeeResponse.status).toBe(201);
    state.employeeId = employeeResponse.body.data.id as string;

    const attendancePayloads = [
      {
        attendanceDate: `${currentDay}T08:00:00.000Z`,
        status: 'PRESENT',
        checkInAt: `${currentDay}T08:03:00.000Z`,
        checkOutAt: `${currentDay}T17:05:00.000Z`
      },
      {
        attendanceDate: `${currentDay}T09:00:00.000Z`,
        status: 'LATE',
        checkInAt: `${currentDay}T09:14:00.000Z`
      }
    ] as const;

    for (const payload of attendancePayloads) {
      const attendanceResponse = await request(baseUrl)
        .post('/attendance')
        .set('Authorization', `Bearer ${state.adminSession?.accessToken}`)
        .send({
          employeeId: state.employeeId,
          departmentId: state.departmentId,
          comment: 'Release e2e attendance',
          source: 'release-e2e',
          ...payload
        });

      expect(attendanceResponse.status).toBe(201);
      state.created.attendanceIds.push(attendanceResponse.body.data.id as string);
    }

    const summaryResponse = await request(baseUrl)
      .get('/attendance/summary')
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`)
      .query({
        departmentId: state.departmentId,
        from: `${currentDay}T00:00:00.000Z`,
        to: `${currentDay}T23:59:59.999Z`
      });

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body).toMatchObject({
      success: true,
      data: {
        present: 1,
        absent: 0,
        late: 1,
        total: 2,
        presenceRate: 50,
        byDepartment: {
          [state.departmentId]: {
            present: 1,
            absent: 0,
            late: 1,
            total: 2
          }
        }
      }
    });
  });

  it('uploads, downloads, deletes and revokes a secured document', async () => {
    const uploadResponse = await request(baseUrl)
      .post('/documents/upload')
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`)
      .field('employeeId', state.employeeId)
      .field('type', 'CONTRACT')
      .field('title', 'Employment contract')
      .field('description', 'Signed release validation copy')
      .attach('file', Buffer.from('%PDF-1.4\nrelease-test\n%%EOF\n'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf'
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body).toMatchObject({
      success: true,
      data: {
        employeeId: state.employeeId,
        type: 'CONTRACT',
        title: 'Employment contract',
        description: 'Signed release validation copy',
        originalName: 'contract.pdf',
        mimeType: 'application/pdf',
        accessLevel: 'PRIVATE'
      }
    });

    state.documentId = uploadResponse.body.data.id as string;

    const dashboardResponse = await request(baseUrl)
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`);

    expect(dashboardResponse.status).toBe(200);
    expect(state.baselineOverview).not.toBeNull();
    expect(dashboardResponse.body).toMatchObject({
      success: true,
      data: {
        totalEmployees: state.baselineOverview!.totalEmployees + 1,
        activeEmployees: state.baselineOverview!.activeEmployees + 1,
        inactiveEmployees: state.baselineOverview!.inactiveEmployees,
        departments: expect.arrayContaining([
          expect.objectContaining({
            id: state.departmentId,
            employeeCount: 1
          })
        ]),
        todayAttendance: state.baselineOverview!.todayAttendance + 2,
        todayLate: state.baselineOverview!.todayLate + 1,
        recentDocuments: expect.arrayContaining([
          expect.objectContaining({
            id: state.documentId,
            employeeId: state.employeeId,
            type: 'CONTRACT',
            title: 'Employment contract'
          })
        ])
      }
    });

    const downloadResponse = await request(baseUrl)
      .get(`/documents/${state.documentId}/download`)
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`);

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers['content-disposition']).toContain('contract.pdf');
    expect(downloadResponse.headers['content-type']).toContain('application/pdf');
    expect(downloadResponse.body.length).toBeGreaterThan(0);

    const deleteResponse = await request(baseUrl)
      .delete(`/documents/${state.documentId}`)
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toMatchObject({
      success: true,
      data: {
        deletedAt: expect.any(String)
      }
    });

    const deletedLookup = await request(baseUrl)
      .get(`/documents/${state.documentId}`)
      .set('Authorization', `Bearer ${state.adminSession?.accessToken}`);

    expect(deletedLookup.status).toBe(404);
  });
});
