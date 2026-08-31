#!/usr/bin/env sh
set -eu

CONTAINER_NAME="${POSTGRES_CONTAINER_NAME:-arkenacore-db-1}"
DATABASE_NAME="${POSTGRES_DB:-arkena_core}"
DATABASE_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="arkena_core-${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"
docker exec "$CONTAINER_NAME" pg_dump -U "$DATABASE_USER" -d "$DATABASE_NAME" --format=custom --file="/tmp/$BACKUP_FILE"
docker cp "$CONTAINER_NAME:/tmp/$BACKUP_FILE" "$BACKUP_DIR/$BACKUP_FILE"
docker exec "$CONTAINER_NAME" rm -f "/tmp/$BACKUP_FILE"

echo "$BACKUP_DIR/$BACKUP_FILE"
