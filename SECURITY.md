# Security

## Controls Implemented

- Helmet
- CORS allowlist
- rate limiting
- Zod validation
- bcrypt password hashing
- JWT access tokens
- server-side refresh token storage
- refresh token hashing
- logout and logout-all support
- permission checks at route level
- secure document download endpoints
- file size limits
- file type limits
- non-revealing error responses
- structured request ids in logs and error payloads
- non-root runtime container
- readiness and liveness probes
- optional bearer protection for operational metrics
- production startup guard against demo secrets
- file-based secret loading for Docker secret stores

## Notes

- Refresh tokens are stored hashed in the database.
- Password reset tokens are also stored hashed.
- Uploaded files are not served as public static assets.
- Sensitive data should live in environment variables, not source code.
- Production can use `_FILE` variables such as `JWT_ACCESS_SECRET_FILE` and `DATABASE_URL_FILE`.
- OpenAPI docs can be disabled in production with `ENABLE_OPENAPI_DOCS=false`.
- Metrics can be disabled with `METRICS_ENABLED=false` or protected with `METRICS_BEARER_TOKEN`.

## Operational Guidance

- Rotate JWT secrets on a controlled schedule.
- Disable demo accounts outside local/demo environments.
- Keep PostgreSQL backups and migration history under version control.
- Review permission mappings before production use.
- Centralize logs and alerts before exposing the service to real traffic.
- Follow [OPERATIONS.md](C:/Users/Ameno%20MonarQue/Documents/ChatGPT/Arkena%20Core/OPERATIONS.md) for release, backup, restore and incident procedures.
