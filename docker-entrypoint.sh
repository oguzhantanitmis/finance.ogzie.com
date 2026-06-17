#!/bin/sh
set -e

# Apply any pending Prisma migrations against the (Dokploy) MySQL before serving.
# Safe no-op when the DB is already up to date (e.g. after importing the dump,
# whose _prisma_migrations table marks the 11 baseline migrations as applied).
echo "[entrypoint] prisma migrate deploy..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] starting Next.js standalone server on :${PORT:-3000}..."
exec node server.js
