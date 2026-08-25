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
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a user'
      }
    },
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List employees'
      }
    },
    '/attendance/summary': {
      get: {
        tags: ['Attendance'],
        summary: 'Attendance summary'
      }
    },
    '/documents/upload': {
      post: {
        tags: ['Documents'],
        summary: 'Upload a secured document'
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
