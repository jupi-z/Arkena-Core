export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Arkena Core API',
    version: '1.0.0',
    description: 'Production-oriented REST API for enterprise workforce management.'
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 120 },
          pages: { type: 'integer', example: 6 }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@arkena.local' },
          password: { type: 'string', example: 'ChangeMe123!' }
        }
      },
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          employeeNumber: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          status: { type: 'string', example: 'ACTIVE' }
        }
      },
      Department: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' }
        }
      },
      AttendanceRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          attendanceDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'PRESENT' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  servers: [
    {
      url: 'http://localhost:3000'
    }
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Departments' },
    { name: 'Employees' },
    { name: 'Attendance' },
    { name: 'Documents' },
    { name: 'Notifications' },
    { name: 'Audit' },
    { name: 'Dashboard' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check'
      }
    },
    '/auth/register-admin': {
      post: {
        tags: ['Auth'],
        summary: 'Register initial super admin'
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a user'
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token'
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the current authenticated user'
      }
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users'
      }
    },
    '/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List departments'
      }
    },
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees'
      }
    },
    '/attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'List attendance records'
      }
    },
    '/attendance/summary': {
      get: {
        tags: ['Attendance'],
        summary: 'Attendance summary'
      }
    },
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents'
      }
    },
    '/documents/upload': {
      post: {
        tags: ['Documents'],
        summary: 'Upload a secured document'
      }
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications'
      }
    },
    '/audit': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs'
      }
    },
    '/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary: 'Dashboard overview'
      }
    }
  }
};
