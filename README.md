# Arkena Core

Production-oriented REST API for enterprise workforce management, built with Node.js, TypeScript, Express, PostgreSQL and Prisma.

## What It Does

Arkena Core is a reusable enterprise backend reference that covers:

- authentication with access and refresh tokens
- RBAC with permissions mapped to roles
- users, employees and departments
- attendance tracking and summaries
- secure document storage and download
- internal notifications
- audit logging
- dashboard statistics
- OpenAPI documentation

## Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- Prisma
- JWT access token + refresh token
- Zod
- bcrypt
- Multer
- Swagger / OpenAPI
- Docker + Docker Compose
- Vitest + Supertest
- Pino

## Architecture

```mermaid
flowchart LR
  Client[Client / Postman / CTO] --> API[Express API]
  API --> Auth[Auth module]
  API --> Users[Users module]
  API --> Employees[Employees module]
  API --> Departments[Departments module]
  API --> Attendance[Attendance module]
  API --> Documents[Documents module]
  API --> Notifications[Notifications module]
  API --> Audit[Audit module]
  API --> Dashboard[Dashboard module]
  Auth --> DB[(PostgreSQL)]
  Users --> DB
  Employees --> DB
  Departments --> DB
  Attendance --> DB
  Documents --> DB
  Notifications --> DB
  Audit --> DB
  Dashboard --> DB
  API --> Docs[/docs OpenAPI/]
```

The code is organized by domain:

```text
src/
  modules/
    auth/
    users/
    employees/
    departments/
    attendance/
    documents/
    notifications/
    audit/
    dashboard/
  common/
    middleware/
    errors/
    validation/
    security/
    logger/
  config/
  database/
  docs/
  app.ts
  server.ts
```

Each module follows the same split:

- `controller`
- `service`
- `repository`
- `routes`
- validation schema
- types

## Quick Start

1. Copy `.env.example` to `.env`
2. Set secrets and database credentials
3. Run the stack:

```bash
docker compose up
```

The API will be available at:

- `http://localhost:3000`
- `http://localhost:3000/docs`

## Environment Variables

Key variables:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_RESET_SECRET`
- `ACCESS_TOKEN_TTL`
- `REFRESH_TOKEN_TTL`
- `RESET_TOKEN_TTL`
- `CORS_ORIGINS`
- `UPLOAD_DIR`
- `MAX_FILE_SIZE_BYTES`

## Migrations

The initial migration is committed in `prisma/migrations/00000000000000_init`.

Useful commands:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

## Tests

Run the test suite with:

```bash
npm test
```

The project is set up for unit and integration tests using Vitest and Supertest.

## API Docs

OpenAPI is served at:

```text
http://localhost:3000/docs
```

## Demo Accounts

The seed creates these sample users:

- `admin@arkena.local` / `ChangeMe123!`
- `hr@arkena.local` / `HrPass123!`
- `manager@arkena.local` / `Manager123!`
- `employee@arkena.local` / `Employee123!`

## Example Requests

### Login

```bash
POST /auth/login
{
  "email": "admin@arkena.local",
  "password": "ChangeMe123!"
}
```

### List Employees

```bash
GET /employees?page=1&limit=20&departmentId=...&status=ACTIVE&search=amina
```

### Attendance Summary

```bash
GET /attendance/summary?from=2026-08-01T00:00:00.000Z&to=2026-08-31T23:59:59.999Z
```

## License

MIT
