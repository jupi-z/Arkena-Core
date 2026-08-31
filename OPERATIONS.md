# Operations Runbook

This runbook describes the minimum operational procedures required to run Arkena Core outside a local demo environment.

## Release Checklist

Before promoting a build:

- Confirm the target branch is `main` and the source branch is `develop`.
- Run `npm run ops:validate-env` with production-equivalent variables or secret files.
- Run `npm run build`.
- Run `npm test`.
- Start a clean stack with `docker compose down -v` then `docker compose up -d --build`.
- Confirm `GET /health/live` returns `200`.
- Confirm `GET /health/ready` returns `200`.
- Run `RUN_RELEASE_E2E=true E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e`.
- Confirm no demo secret is used in production.
- Confirm `ENABLE_OPENAPI_DOCS=false` in production if API docs must not be public.
- Confirm `/metrics` is private or protected by `METRICS_BEARER_TOKEN`.
- Run `npm audit --audit-level=high`.

## Health Checks

- `/health/live` confirms the process is running.
- `/health/ready` confirms the process can receive traffic and reach PostgreSQL.
- `/health` returns aggregate service status for manual checks.

Load balancers and orchestrators should use `/health/ready` for traffic routing and `/health/live` for process restart decisions.

## Metrics

`/metrics` exposes Prometheus-compatible text metrics:

- `arkena_process_start_time_seconds`
- `arkena_process_uptime_seconds`
- `arkena_nodejs_memory_rss_bytes`
- `arkena_http_requests_total`
- `arkena_http_request_duration_seconds`

Run Prometheus and Grafana with:

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml -f deploy/docker-compose.observability.yml up -d
```

Recommended initial alerts:

- Readiness probe failure for more than 2 minutes.
- HTTP 5xx rate above 1% for 5 minutes.
- P95 request latency above the API service objective for 10 minutes.
- PostgreSQL connection failures in logs.
- Container restart loop.

## Logs

Application logs are structured JSON via Pino and include:

- service name
- version
- environment
- request id
- request metadata
- response status and duration

Forward container stdout to the target platform log sink. Keep request ids in error responses so support can correlate client reports with logs.

## Backup

For Docker Compose deployments, a logical PostgreSQL backup can be created with:

```bash
scripts/backup-postgres.sh
```

On Windows PowerShell:

```powershell
./scripts/backup-postgres.ps1
```

Production guidance:

- Run backups from a private administration host or managed database backup system.
- Encrypt backups at rest.
- Store backups outside the application host.
- Keep at least daily backups for the agreed retention window.
- Test restoration on a separate environment before relying on backups.

## Restore Drill

Restore only into an empty or disposable database unless a controlled production incident procedure is active.

```bash
docker compose up -d db
ALLOW_RESTORE=true scripts/restore-postgres.sh ./backups/arkena_core.dump
docker compose up -d api
```

On Windows PowerShell:

```powershell
docker compose up -d db
$env:ALLOW_RESTORE = 'true'
./scripts/restore-postgres.ps1 ./backups/arkena_core.dump
docker compose up -d api
```

After restoration:

- Confirm `/health/ready` returns `200`.
- Log in with a known non-demo admin account.
- Check employee, department, attendance and document metadata counts.
- Run the release E2E flow on the restored environment if disposable.

## Secret Rotation

Secrets that must be rotatable:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_RESET_SECRET`
- database password
- `METRICS_BEARER_TOKEN`

Production Compose reads sensitive values from files under `secrets/`. The real directory is ignored by Git; use `deploy/secrets.example/README.md` as the template.

Recommended JWT rotation process:

- Deploy with a maintenance window when refresh token invalidation is acceptable.
- Replace JWT secrets in the runtime secret store.
- Restart the API.
- Revoke existing refresh tokens if refresh secret rotation must invalidate all sessions.
- Monitor login, refresh and 401 rates after rollout.

## Incident Response

First checks:

- Inspect `/health/live` and `/health/ready`.
- Check recent 5xx logs grouped by request id.
- Check PostgreSQL availability and connection errors.
- Check disk usage for the database volume and uploads directory.
- Check whether a recent deployment or migration changed the failure rate.

Rollback criteria:

- Readiness remains failing after the database is confirmed healthy.
- Login or refresh token flow is broken.
- File upload/download authorization fails.
- Migration introduces data integrity failures.

## Load Testing

Minimum pre-production scenarios:

- Auth login and refresh token rotation.
- Employee list with pagination and search.
- Attendance creation burst for the same department.
- Document upload and secured download.
- Dashboard overview under concurrent reads.

Use a disposable environment with production-like limits. Do not run destructive load tests against production data.

Run the built-in lightweight load check with:

```bash
LOAD_TEST_BASE_URL=http://127.0.0.1:3000 LOAD_TEST_PATH=/health/ready npm run test:load
```

Default thresholds are `p95 <= 500ms` and error rate `<= 1%`.
