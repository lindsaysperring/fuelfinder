#!/bin/sh
set -e

echo "🚀 Starting FuelFinder application..."

# Ensure DATABASE_URL is set, use default if not provided
export DATABASE_URL="${DATABASE_URL:-file:./prisma/dev.db}"

# Run Prisma migrations using pnpm dlx (config file is copied from builder)
echo "🔄 Running Prisma migrations..."
pnpm dlx prisma migrate deploy 2>/dev/null || pnpm dlx prisma db push --accept-data-loss

echo "✅ Database ready!"

# Execute the main command
exec "$@"
