# Deployment

Arkena Core ships with three Compose profiles:

- `docker-compose.yml` for local development and demos.
- `deploy/docker-compose.staging.yml` for staging validation with demo seed support.
- `deploy/docker-compose.prod.yml` for production-like runtime without automatic demo seed.
- `deploy/docker-compose.observability.yml` for Prometheus and Grafana.

## Local

```bash
cp .env.example .env
docker compose up -d --build
```

Local Compose intentionally uses development defaults and seeds demo data.

## Staging

Create `.env` from `.env.production.example`, then create the secret files documented in `deploy/secrets.example/README.md`.

```bash
docker compose --env-file .env -f deploy/docker-compose.staging.yml up -d --build
```

Staging uses production runtime validation and file-based secrets, but still runs the seed to make release smoke validation repeatable.

Validation:

```bash
npm run ops:validate-env
npm run build
npm test
RUN_RELEASE_E2E=true E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
npm run test:load
```

## Production

Build and publish the API image from a validated `main` commit, then set `ARKENA_IMAGE` to the immutable image reference.

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d
```

Production Compose:

- refuses demo secrets through `npm run ops:validate-env`
- loads sensitive values from Docker secret files through `scripts/docker-entrypoint.sh`
- runs `prisma migrate deploy`
- does not run the demo seed
- requires file-based secrets
- disables OpenAPI docs by default
- requires protected metrics when metrics are enabled

## Observability

Run the observability overlay with staging or production:

```bash
docker compose --env-file .env -f deploy/docker-compose.prod.yml -f deploy/docker-compose.observability.yml up -d
```

Endpoints:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

The Grafana dashboard is provisioned from `monitoring/grafana/dashboards/arkena-core.json`.

## Rollback

Rollback is image-based:

- keep the previous immutable image tag
- set `ARKENA_IMAGE` back to the previous tag
- run `docker compose --env-file .env -f deploy/docker-compose.prod.yml up -d`
- confirm `/health/ready`
- review error rate and latency in Grafana

Never rollback database migrations blindly. If a migration must be reverted, follow a reviewed database incident procedure and restore drill.
