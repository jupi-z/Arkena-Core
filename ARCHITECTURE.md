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

## Runtime Operations

Operational endpoints now distinguish:

- liveness: `/health/live`
- readiness: `/health/ready`
- aggregate status: `/health`

The server also supports graceful shutdown on `SIGINT` and `SIGTERM`.

## Audit

Important mutations can emit audit events through the audit service, storing:

- actor
- action
- resource
- resource id
- IP
- user-agent
- optional before/after payloads
