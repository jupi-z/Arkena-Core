# Architecture

## Goal

Arkena Core is a backend reference for enterprise workforce management. The code intentionally separates:

- HTTP concerns
- business rules
- persistence
- security
- validation

## Layers

### 1. Routes

Define endpoints and middleware order.

### 2. Controllers

Adapt Express requests and responses to the service layer.

### 3. Services

Contain business rules, permissions decisions and orchestration.

### 4. Repositories

Wrap Prisma queries and keep data access in one place.

### 5. Common

Contains reusable middleware, errors, response helpers, security helpers and logging.

## Data Model

Core entities:

- `User`
- `Permission`
- `RolePermission`
- `Employee`
- `Department`
- `AttendanceRecord`
- `Document`
- `Notification`
- `AuditLog`
- `RefreshToken`
- `PasswordResetToken`

## RBAC Model

Roles are stored in the database and mapped to permissions:

- `SUPER_ADMIN`
- `ADMIN`
- `HR`
- `MANAGER`
- `EMPLOYEE`

The application checks permissions, not raw role strings, at route level.

## File Storage

Uploaded documents are stored outside the public route tree and only returned through authenticated download endpoints.

## Attendance Invariant

`AttendanceRecord.attendanceDay` is the canonical UTC calendar day and is stored as PostgreSQL `DATE`. A unique constraint on `(employeeId, attendanceDay)` guarantees one record per employee per day. `checkInAt` and `checkOutAt` are separate timestamps; service and request validation reject a checkout before check-in. The migration preserves the earliest legacy record when old timestamp data collides on the same UTC day.

## Runtime Operations

Operational endpoints now distinguish:

- liveness: `/health/live`
- readiness: `/health/ready`
- aggregate status: `/health`

The server also supports graceful shutdown on `SIGINT` and `SIGTERM`.

Runtime telemetry is exposed through `/metrics` in Prometheus text format. The endpoint is enabled by `METRICS_ENABLED` and can require a bearer token through `METRICS_BEARER_TOKEN`.

## Audit

Important mutations can emit audit events through the audit service, storing:

- actor
- action
- resource
- resource id
- IP
- user-agent
- optional before/after payloads
