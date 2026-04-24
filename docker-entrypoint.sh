#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy || echo "Prisma migrate failed, continuing..."

echo "Starting Next.js server..."
exec node server.js
