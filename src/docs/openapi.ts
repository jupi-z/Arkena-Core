const jsonContent = (schema: Record<string, unknown>) => ({
  'application/json': { schema }
});

const successResponse = (dataSchema: Record<string, unknown>, description = 'Successful response') => ({
  description,
  content: jsonContent({
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: dataSchema
    },
    required: ['success', 'data']
  })
});

const paginatedResponse = (itemSchema: Record<string, unknown>, description = 'Successful response') => ({
  description,
  content: jsonContent({
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'array',
        items: itemSchema
      },
      meta: { $ref: '#/components/schemas/PaginationMeta' }
    },
    required: ['success', 'data', 'meta']
  })
});

const messageResponse = (message: string, description = 'Successful response') => successResponse(
  {
    type: 'object',
    properties: {
      message: { type: 'string', example: message }
    },
    required: ['message']
  },
  description
);

const errorResponse = (description: string) => ({
  description,
  content: jsonContent({
    $ref: '#/components/schemas/ErrorResponse'
  })
});

const binaryResponse = (description: string) => ({
  description,
  content: {
    'application/octet-stream': {
      schema: { type: 'string', format: 'binary' }
    }
  }
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' }
} as const;

const paginationParameters = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  { name: 'sortBy', in: 'query', schema: { type: 'string' } },
  { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } }
];

const dateRangeParameters = [
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } }
];

const filterParameters = {
  employeeId: { name: 'employeeId', in: 'query', schema: { type: 'string' } },
  departmentId: { name: 'departmentId', in: 'query', schema: { type: 'string' } },
  status: { name: 'status', in: 'query', schema: { type: 'string' } },
  action: { name: 'action', in: 'query', schema: { type: 'string' } },
  resource: { name: 'resource', in: 'query', schema: { type: 'string' } },
  type: { name: 'type', in: 'query', schema: { type: 'string' } }
} as const;

const authErrorResponses = {
  400: errorResponse('Validation error'),
  401: errorResponse('Unauthorized'),
  403: errorResponse('Forbidden')
};

const listErrorResponses = {
  ...authErrorResponses,
  404: errorResponse('Resource not found')
};

const listResponse = (itemSchema: Record<string, unknown>) => paginatedResponse(itemSchema);

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Arkena Core API',
    version: '1.0.0',
    description: 'Production-oriented REST API for enterprise workforce management.'
  },
  servers: [
    {
      url: 'http://localhost:3000'
    }
  ],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Health' },
    { name: 'Observability' },
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
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'array', items: { type: 'string' } },
                    message: { type: 'string' }
                  }
                }
              }
            },
            required: ['code', 'message']
          }
        },
        required: ['success', 'error']
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 120 },
          pages: { type: 'integer', example: 6 }
        },
        required: ['page', 'limit', 'total', 'pages']
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@arkena.local' },
          password: { type: 'string', example: 'ChangeMe123!' }
        }
      },
      RegisterInitialAdminRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@arkena.local' },
          password: { type: 'string', example: 'ChangeMe123!' },
          firstName: { type: 'string', example: 'Super' },
          lastName: { type: 'string', example: 'Admin' },
          phone: { type: 'string', example: '+0000000000' }
        }
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string', example: 'refresh-token-value' }
        }
      },
      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email', example: 'employee@arkena.local' }
        }
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string', example: 'reset-token-value' },
          password: { type: 'string', example: 'NewPassword123!' }
        }
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'OldPassword123!' },
          newPassword: { type: 'string', example: 'NewPassword123!' }
        }
      },
      TokenPair: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          refreshTokenExpiresAt: { type: 'string', format: 'date-time' }
        },
        required: ['accessToken', 'refreshToken', 'refreshTokenExpiresAt']
      },
      AuthSession: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          refreshTokenExpiresAt: { type: 'string', format: 'date-time' },
          user: { $ref: '#/components/schemas/User' }
        },
        required: ['accessToken', 'refreshToken', 'refreshTokenExpiresAt', 'user']
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', example: 'ADMIN' },
          status: { type: 'string', example: 'ACTIVE' },
          permissions: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['id', 'email', 'firstName', 'lastName', 'role', 'status']
      },
      UserUpdateRequest: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          status: { type: 'string' }
        }
      },
      RoleAssignmentRequest: {
        type: 'object',
        required: ['role'],
        properties: {
          role: { type: 'string', example: 'HR' }
        }
      },
      Department: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          code: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          managerEmployeeId: { type: 'string', nullable: true }
        },
        required: ['id', 'code', 'name']
      },
      DepartmentRequest: {
        type: 'object',
        required: ['code', 'name'],
        properties: {
          code: { type: 'string', example: 'HR' },
          name: { type: 'string', example: 'Human Resources' },
          description: { type: 'string', example: 'People operations team' },
          managerEmployeeId: { type: 'string', nullable: true }
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
          phone: { type: 'string', nullable: true },
          jobTitle: { type: 'string', nullable: true },
          hireDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'ACTIVE' },
          departmentId: { type: 'string', nullable: true },
          managerId: { type: 'string', nullable: true },
          userId: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true }
        },
        required: ['id', 'employeeNumber', 'firstName', 'lastName', 'email', 'hireDate', 'status']
      },
      EmployeeRequest: {
        type: 'object',
        required: ['employeeNumber', 'firstName', 'lastName', 'email', 'hireDate'],
        properties: {
          employeeNumber: { type: 'string', example: 'EMP-0001' },
          firstName: { type: 'string', example: 'Amena' },
          lastName: { type: 'string', example: 'Kone' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          jobTitle: { type: 'string', nullable: true },
          hireDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'ACTIVE' },
          departmentId: { type: 'string', nullable: true },
          managerId: { type: 'string', nullable: true },
          userId: { type: 'string', nullable: true },
          notes: { type: 'string', nullable: true }
        }
      },
      EmployeeArchiveRequest: {
        type: 'object',
        properties: {
          archivedAt: { type: 'string', format: 'date-time' }
        }
      },
      AttendanceRecord: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string' },
          departmentId: { type: 'string', nullable: true },
          attendanceDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', example: 'PRESENT' },
          checkInAt: { type: 'string', format: 'date-time', nullable: true },
          checkOutAt: { type: 'string', format: 'date-time', nullable: true },
          comment: { type: 'string', nullable: true },
          source: { type: 'string', nullable: true }
        },
        required: ['id', 'employeeId', 'attendanceDate', 'status']
      },
      AttendanceRequest: {
        type: 'object',
        required: ['employeeId', 'attendanceDate', 'status'],
        properties: {
          employeeId: { type: 'string' },
          departmentId: { type: 'string', nullable: true },
          attendanceDate: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] },
          checkInAt: { type: 'string', format: 'date-time', nullable: true },
          checkOutAt: { type: 'string', format: 'date-time', nullable: true },
          comment: { type: 'string', nullable: true },
          source: { type: 'string', nullable: true }
        }
      },
      AttendanceSummary: {
        type: 'object',
        properties: {
          byStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                count: { type: 'integer' }
              },
              required: ['status', 'count']
            }
          },
          attendanceRate: { type: 'number', example: 92.4 },
          absences: { type: 'integer', example: 8 },
          lates: { type: 'integer', example: 4 },
          byDepartment: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                departmentId: { type: 'string' },
                departmentName: { type: 'string' },
                present: { type: 'integer' },
                absent: { type: 'integer' },
                late: { type: 'integer' }
              }
            }
          }
        }
      },
      Document: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          employeeId: { type: 'string' },
          type: { type: 'string', example: 'CONTRACT' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          originalName: { type: 'string' },
          mimeType: { type: 'string' },
          size: { type: 'integer' },
          uploadedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'employeeId', 'type', 'title', 'originalName', 'mimeType', 'size', 'uploadedAt']
      },
      DocumentMetadataRequest: {
        type: 'object',
        required: ['employeeId', 'type', 'title'],
        properties: {
          employeeId: { type: 'string' },
          type: { type: 'string', enum: ['CONTRACT', 'ID_CARD', 'ATTESTATION', 'CV', 'OTHER'] },
          title: { type: 'string' },
          description: { type: 'string', nullable: true }
        }
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          recipientUserId: { type: 'string' },
          type: { type: 'string', example: 'INFO' },
          title: { type: 'string' },
          body: { type: 'string' },
          resourceType: { type: 'string', nullable: true },
          resourceId: { type: 'string', nullable: true },
          readAt: { type: 'string', format: 'date-time', nullable: true }
        },
        required: ['id', 'recipientUserId', 'type', 'title', 'body']
      },
      NotificationRequest: {
        type: 'object',
        required: ['recipientUserId', 'title', 'body'],
        properties: {
          recipientUserId: { type: 'string' },
          type: { type: 'string', enum: ['INFO', 'WARNING', 'SUCCESS', 'ERROR', 'SYSTEM'], default: 'INFO' },
          title: { type: 'string' },
          body: { type: 'string' },
          resourceType: { type: 'string', nullable: true },
          resourceId: { type: 'string', nullable: true },
          metadata: { type: 'object', additionalProperties: true }
        }
      },
      AuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          actorUserId: { type: 'string', nullable: true },
          action: { type: 'string', example: 'UPDATE' },
          resource: { type: 'string', example: 'EMPLOYEE' },
          resourceId: { type: 'string', nullable: true },
          ip: { type: 'string', nullable: true },
          userAgent: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'action', 'resource', 'createdAt']
      },
      DashboardOverview: {
        type: 'object',
        properties: {
          totalEmployees: { type: 'integer' },
          activeEmployees: { type: 'integer' },
          inactiveEmployees: { type: 'integer' },
          departments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                employeeCount: { type: 'integer' }
              },
              required: ['id', 'name', 'employeeCount']
            }
          },
          todayAttendance: { type: 'integer' },
          todayLate: { type: 'integer' },
          recentDocuments: {
            type: 'array',
            items: { $ref: '#/components/schemas/Document' }
          }
        }
      },
      DashboardEmployees: {
        type: 'object',
        properties: {
          byStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                count: { type: 'integer' }
              },
              required: ['status', 'count']
            }
          },
          byDepartment: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                employeeCount: { type: 'integer' }
              },
              required: ['id', 'name', 'employeeCount']
            }
          }
        }
      },
      DashboardAttendance: {
        type: 'object',
        properties: {
          byStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                count: { type: 'integer' }
              },
              required: ['status', 'count']
            }
          }
        }
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string', example: 'Arkena Core' },
          version: { type: 'string', example: '1.0.0' },
          environment: { type: 'string', example: 'production' },
          uptimeSeconds: { type: 'integer', example: 124 },
          dependencies: {
            type: 'object',
            properties: {
              database: { type: 'string', example: 'up' }
            }
          }
        },
        required: ['status', 'service', 'version', 'environment', 'uptimeSeconds']
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Aggregated health check',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/HealthResponse' }),
          503: errorResponse('Service degraded'),
          500: errorResponse('Server error')
        }
      }
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/HealthResponse' }),
          500: errorResponse('Server error')
        }
      }
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/HealthResponse' }),
          503: errorResponse('Service not ready'),
          500: errorResponse('Server error')
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['Observability'],
        summary: 'Prometheus-compatible operational metrics',
        security: [],
        responses: {
          200: {
            description: 'Prometheus text exposition format',
            content: {
              'text/plain': {
                schema: {
                  type: 'string',
                  example: '# HELP arkena_http_requests_total Total HTTP requests by method, route and status code.\narkena_http_requests_total{method="GET",route="/health/live",status_code="200"} 1\n'
                }
              }
            }
          },
          401: errorResponse('Metrics bearer token missing or invalid'),
          404: errorResponse('Metrics disabled'),
          500: errorResponse('Server error')
        }
      }
    },
    '/auth/register-admin': {
      post: {
        tags: ['Auth'],
        summary: 'Register the initial super admin',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/RegisterInitialAdminRequest' })
        },
        responses: {
          201: successResponse({ $ref: '#/components/schemas/AuthSession' }, 'Admin account created'),
          400: errorResponse('Validation error'),
          409: errorResponse('Admin already exists')
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a user',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/LoginRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/AuthSession' }),
          ...authErrorResponses
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate the refresh token and issue a new access token',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/RefreshRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/AuthSession' }),
          ...authErrorResponses
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the current refresh token',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/RefreshRequest' })
        },
        responses: {
          200: messageResponse('Logged out'),
          ...authErrorResponses
        }
      }
    },
    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke all refresh tokens for the current user',
        responses: {
          200: messageResponse('All sessions revoked'),
          ...authErrorResponses
        }
      }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/ForgotPasswordRequest' })
        },
        responses: {
          202: messageResponse('Reset instructions sent'),
          ...authErrorResponses
        }
      }
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset the password using a token',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/ResetPasswordRequest' })
        },
        responses: {
          200: messageResponse('Password reset'),
          ...authErrorResponses
        }
      }
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change the current password',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/ChangePasswordRequest' })
        },
        responses: {
          200: messageResponse('Password changed'),
          ...authErrorResponses
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Return the current authenticated user',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/User' }),
          ...authErrorResponses
        }
      }
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        parameters: paginationParameters,
        responses: {
          200: listResponse({ $ref: '#/components/schemas/User' }),
          ...listErrorResponses
        }
      }
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a user by id',
        parameters: [idParam],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/User' }),
          ...listErrorResponses
        }
      },
      patch: {
        tags: ['Users'],
        summary: 'Update a user profile',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/UserUpdateRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/User' }),
          ...listErrorResponses
        }
      }
    },
    '/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Assign a role to a user',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/RoleAssignmentRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/User' }),
          ...listErrorResponses
        }
      }
    },
    '/departments': {
      get: {
        tags: ['Departments'],
        summary: 'List departments',
        parameters: paginationParameters,
        responses: {
          200: listResponse({ $ref: '#/components/schemas/Department' }),
          ...listErrorResponses
        }
      },
      post: {
        tags: ['Departments'],
        summary: 'Create a department',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/DepartmentRequest' })
        },
        responses: {
          201: successResponse({ $ref: '#/components/schemas/Department' }),
          ...listErrorResponses
        }
      }
    },
    '/departments/{id}': {
      get: {
        tags: ['Departments'],
        summary: 'Get a department by id',
        parameters: [idParam],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Department' }),
          ...listErrorResponses
        }
      },
      patch: {
        tags: ['Departments'],
        summary: 'Update a department',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/DepartmentRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Department' }),
          ...listErrorResponses
        }
      },
      delete: {
        tags: ['Departments'],
        summary: 'Delete a department',
        parameters: [idParam],
        responses: {
          200: messageResponse('Department deleted'),
          ...listErrorResponses
        }
      }
    },
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees',
        parameters: [
          ...paginationParameters,
          filterParameters.departmentId,
          filterParameters.employeeId,
          filterParameters.status
        ],
        responses: {
          200: listResponse({ $ref: '#/components/schemas/Employee' }),
          ...listErrorResponses
        }
      },
      post: {
        tags: ['Employees'],
        summary: 'Create an employee',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/EmployeeRequest' })
        },
        responses: {
          201: successResponse({ $ref: '#/components/schemas/Employee' }),
          ...listErrorResponses
        }
      }
    },
    '/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get an employee by id',
        parameters: [idParam],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Employee' }),
          ...listErrorResponses
        }
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update an employee',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/EmployeeRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Employee' }),
          ...listErrorResponses
        }
      }
    },
    '/employees/{id}/archive': {
      post: {
        tags: ['Employees'],
        summary: 'Archive an employee',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/EmployeeArchiveRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Employee' }),
          ...listErrorResponses
        }
      }
    },
    '/attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'List attendance records',
        parameters: [
          ...paginationParameters,
          filterParameters.departmentId,
          filterParameters.employeeId,
          filterParameters.status,
          ...dateRangeParameters
        ],
        responses: {
          200: listResponse({ $ref: '#/components/schemas/AttendanceRecord' }),
          ...listErrorResponses
        }
      },
      post: {
        tags: ['Attendance'],
        summary: 'Create an attendance record',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/AttendanceRequest' })
        },
        responses: {
          201: successResponse({ $ref: '#/components/schemas/AttendanceRecord' }),
          ...listErrorResponses
        }
      }
    },
    '/attendance/summary': {
      get: {
        tags: ['Attendance'],
        summary: 'Attendance summary',
        parameters: [
          filterParameters.departmentId,
          filterParameters.employeeId,
          ...dateRangeParameters
        ],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/AttendanceSummary' }),
          ...listErrorResponses
        }
      }
    },
    '/attendance/{id}': {
      get: {
        tags: ['Attendance'],
        summary: 'Get an attendance record by id',
        parameters: [idParam],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/AttendanceRecord' }),
          ...listErrorResponses
        }
      },
      patch: {
        tags: ['Attendance'],
        summary: 'Update an attendance record',
        parameters: [idParam],
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/AttendanceRequest' })
        },
        responses: {
          200: successResponse({ $ref: '#/components/schemas/AttendanceRecord' }),
          ...listErrorResponses
        }
      },
      delete: {
        tags: ['Attendance'],
        summary: 'Delete an attendance record',
        parameters: [idParam],
        responses: {
          200: messageResponse('Attendance record deleted'),
          ...listErrorResponses
        }
      }
    },
    '/documents': {
      get: {
        tags: ['Documents'],
        summary: 'List documents',
        parameters: [
          ...paginationParameters,
          filterParameters.employeeId,
          filterParameters.type
        ],
        responses: {
          200: listResponse({ $ref: '#/components/schemas/Document' }),
          ...listErrorResponses
        }
      }
    },
    '/documents/upload': {
      post: {
        tags: ['Documents'],
        summary: 'Upload a secured document',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file', 'employeeId', 'type', 'title'],
                properties: {
                  file: { type: 'string', format: 'binary' },
                  employeeId: { type: 'string' },
                  type: { type: 'string', enum: ['CONTRACT', 'ID_CARD', 'ATTESTATION', 'CV', 'OTHER'] },
                  title: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: successResponse({ $ref: '#/components/schemas/Document' }),
          ...listErrorResponses
        }
      }
    },
    '/documents/{id}': {
      get: {
        tags: ['Documents'],
        summary: 'Get a document by id',
        parameters: [idParam],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Document' }),
          ...listErrorResponses
        }
      },
      delete: {
        tags: ['Documents'],
        summary: 'Delete a document',
        parameters: [idParam],
        responses: {
          200: messageResponse('Document deleted'),
          ...listErrorResponses
        }
      }
    },
    '/documents/{id}/download': {
      get: {
        tags: ['Documents'],
        summary: 'Download a document',
        parameters: [idParam],
        responses: {
          200: binaryResponse('Document binary stream'),
          ...listErrorResponses
        }
      }
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        parameters: paginationParameters,
        responses: {
          200: listResponse({ $ref: '#/components/schemas/Notification' }),
          ...listErrorResponses
        }
      },
      post: {
        tags: ['Notifications'],
        summary: 'Create a notification',
        requestBody: {
          required: true,
          content: jsonContent({ $ref: '#/components/schemas/NotificationRequest' })
        },
        responses: {
          201: successResponse({ $ref: '#/components/schemas/Notification' }),
          ...listErrorResponses
        }
      }
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        parameters: [idParam],
        responses: {
          200: successResponse({ $ref: '#/components/schemas/Notification' }),
          ...listErrorResponses
        }
      }
    },
    '/audit': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs',
        parameters: [
          ...paginationParameters,
          filterParameters.resource,
          filterParameters.action
        ],
        responses: {
          200: listResponse({ $ref: '#/components/schemas/AuditLog' }),
          ...listErrorResponses
        }
      }
    },
    '/dashboard/overview': {
      get: {
        tags: ['Dashboard'],
        summary: 'Dashboard overview',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/DashboardOverview' }),
          ...listErrorResponses
        }
      }
    },
    '/dashboard/employees': {
      get: {
        tags: ['Dashboard'],
        summary: 'Employee dashboard statistics',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/DashboardEmployees' }),
          ...listErrorResponses
        }
      }
    },
    '/dashboard/attendance': {
      get: {
        tags: ['Dashboard'],
        summary: 'Attendance dashboard statistics',
        responses: {
          200: successResponse({ $ref: '#/components/schemas/DashboardAttendance' }),
          ...listErrorResponses
        }
      }
    }
  }
} as const;
