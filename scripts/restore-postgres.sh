#!/usr/bin/env sh
set -eu

if [ "${ALLOW_RESTORE:-}" != "true" ]; then
  echo "Refusing restore. Set ALLOW_RESTORE=true after confirming the target database is disposable or in an approved incident procedure." >&2
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "Usage: ALLOW_RESTORE=true scripts/restore-postgres.sh ./backups/arkena_core.dump" >&2
  exit 1
fi

BACKUP_PATH="$1"
CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-arkenacore-db-1}"
DATABASE_NAME="${POSTGRES_DB:-arkena_core}"
DATABASE_USER="${POSTGRES_USER:-postgres}"
RESTORE_FILE="/tmp/arkena_core-restore.dump"

docker cp "$BACKUP_PATH" "$CONTAINER_NAME:$RESTORE_FILE"
docker exec "$CONTAINER_NAME" pg_restore -U "$DATABASE_USER" -d "$DATABASE_NAME" --clean --if-exists "$RESTORE_FILE"
docker exec "$CONTAINER_NAME" rm -f "$RESTORE_FILE"

echo "Restore completed from $BACKUP_PATH"
