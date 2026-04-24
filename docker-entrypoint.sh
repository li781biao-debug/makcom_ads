#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy 2>/dev/null || echo "Prisma migrate skipped (first run or no new migrations)"

echo "Starting Next.js server..."
exec node server.js
