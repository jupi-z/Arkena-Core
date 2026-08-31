# Production Secrets Template

Create a local `secrets/` directory at the repository root before running the production Compose files. The real `secrets/` directory is intentionally ignored by Git.

Required files:

- `secrets/postgres_password.txt`
- `secrets/database_url.txt`
- `secrets/jwt_access_secret.txt`
- `secrets/jwt_refresh_secret.txt`
- `secrets/jwt_reset_secret.txt`
- `secrets/metrics_bearer_token.txt`
- `secrets/default_super_admin_password.txt`
- `secrets/grafana_admin_password.txt`

Example database URL format:

```text
postgresql://arkena:<postgres_password>@db:5432/arkena_core?schema=public
```

Use unique high-entropy values. Do not reuse the values from `.env.example`.
