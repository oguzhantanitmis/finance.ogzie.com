# syntax=docker/dockerfile:1
# Multi-stage build for Next.js (standalone) + Prisma (MySQL) on Dokploy.

# ---- deps: install full deps (incl. prisma CLI) ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
# Prisma schema must be present before `npm ci` because package.json has a
# `postinstall: prisma generate` that fails without ./prisma/schema.prisma.
COPY prisma ./prisma
# Prisma's engine files are downloaded from its binary CDN during postinstall.
# Keep the engine cache across BuildKit builds and retry transient CDN/network
# failures so a brief checksum or binary download interruption cannot abort a
# production deployment.
RUN --mount=type=cache,target=/root/.cache/prisma \
    set -eu; \
    attempt=1; \
    until npm ci; do \
      if [ "$attempt" -ge 4 ]; then \
        echo "npm ci failed after $attempt attempts" >&2; \
        exit 1; \
      fi; \
      delay=$((attempt * 5)); \
      echo "npm ci attempt $attempt failed; retrying in ${delay}s" >&2; \
      sleep "$delay"; \
      attempt=$((attempt + 1)); \
    done

# ---- builder: generate Prisma client + build Next ----
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time-only placeholders keep import-time validation operational. They
# apply only to this command and are not persisted in an image layer as ENV.
# Dokploy supplies the real runtime values.
RUN DATABASE_URL="mysql://build:build@127.0.0.1:3306/build" \
    NEXTAUTH_SECRET="build_time_placeholder_not_used_at_runtime" \
    APP_SETTINGS_SECRET="build_time_placeholder_not_used_at_runtime" \
    NEXTAUTH_URL="https://finance.ogzie.com" \
    npm run build

# ---- runner: standalone server + prisma CLI/engines for migrate deploy ----
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Next.js standalone output (includes a trimmed node_modules with @prisma/client + query engine)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Prisma schema + migrations + CLI + engines so the entrypoint can run `migrate deploy`
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
