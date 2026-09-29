#!/bin/sh
set -eu

echo "🚀 Starting FuelFinder application..."

: "${DATABASE_URL:?DATABASE_URL must be set, e.g. file:/app/data/prod.db}"
export DATABASE_URL

echo "🔄 Running Prisma migrations against ${DATABASE_URL}..."
prisma --version

# ponytail: single retry, add backoff if boot-time SQLite lock contention shows up in logs
if ! prisma migrate deploy; then
  echo "⚠️  migrate deploy failed, retrying once in 2s..." >&2
  sleep 2
  prisma migrate deploy
fi || {
  echo "❌ Prisma migrations failed for ${DATABASE_URL}" >&2
  echo "--- diagnostics ---" >&2
  prisma migrate status >&2 || true
  ls -ld /app/data >&2 || true
  exit 1
}

echo "✅ Database ready!"

exec "$@"
