#!/usr/bin/env sh
set -eu

for name in \
  DATABASE_URL \
  JWT_ACCESS_SECRET \
  JWT_REFRESH_SECRET \
  JWT_RESET_SECRET \
  METRICS_BEARER_TOKEN \
  DEFAULT_SUPER_ADMIN_PASSWORD
do
  file_var="${name}_FILE"
  eval file_path="\${$file_var:-}"
  if [ -n "$file_path" ]; then
    if [ ! -r "$file_path" ]; then
      echo "$file_var points to an unreadable file: $file_path" >&2
      exit 1
    fi
    value="$(cat "$file_path")"
    export "$name=$value"
  fi
done

exec "$@"
