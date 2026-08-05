#!/bin/sh
set -e

# Apply any pending Prisma migrations against Dokploy PostgreSQL before serving.
# Safe no-op when the baseline migration was applied during the rehearsed cutover.
echo "[entrypoint] prisma migrate deploy..."
node node_modules/prisma/build/index.js migrate deploy

echo "[entrypoint] starting Next.js standalone server on :${PORT:-3000}..."
exec node server.js
