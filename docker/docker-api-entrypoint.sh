#!/bin/sh
set -e

if [ "${AUTO_RUN_MIGRATIONS}" = "true" ]; then
  echo "Running database migrations..."
  MIGRATIONS_ONLY=true node main.js
fi

exec node main.js
