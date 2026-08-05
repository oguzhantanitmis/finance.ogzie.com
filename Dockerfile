# syntax=docker/dockerfile:1
# Multi-stage build for Next.js (standalone) + Prisma (PostgreSQL) on Dokploy.

# ---- deps: install full deps (incl. prisma CLI) ----
FROM node:20-alpine AS deps
RUN apk add --no-cache curl libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
# Prisma schema must be present before `npm ci` because package.json has a
# `postinstall: prisma generate` that fails without ./prisma/schema.prisma.
COPY prisma ./prisma
# Prisma 5.19.0's Node downloader fails on this build host even though curl in
# the same container can reach the official CDN. Seed Prisma's normal cache via
# curl and verify both compressed and uncompressed SHA-256 checksums first.
# The commit below is Prisma 5.19.0's engine commit and must move with Prisma.
RUN --mount=type=cache,target=/root/.cache/prisma \
    set -eu; \
    engine_commit="5fe21811a6ba0b952a3bc71400666511fe3b902f"; \
    engine_target="linux-musl-openssl-3.0.x"; \
    engine_base="https://binaries.prisma.sh/all_commits/${engine_commit}/${engine_target}"; \
    engine_cache="/root/.cache/prisma/master/${engine_commit}/${engine_target}"; \
    mkdir -p "$engine_cache"; \
    fetch_engine() { \
      archive_name="$1"; \
      cache_name="$2"; \
      url="${engine_base}/${archive_name}"; \
      archive="/tmp/${archive_name}"; \
      compressed_hash="$(curl -fsSL --retry 4 --retry-all-errors --retry-delay 2 --connect-timeout 15 --max-time 120 "${url}.sha256" | awk '{print $1}')"; \
      uncompressed_hash="$(curl -fsSL --retry 4 --retry-all-errors --retry-delay 2 --connect-timeout 15 --max-time 120 "${url%.gz}.sha256" | awk '{print $1}')"; \
      curl -fsSL --retry 4 --retry-all-errors --retry-delay 2 --connect-timeout 15 --max-time 120 "$url" -o "$archive"; \
      printf '%s  %s\n' "$compressed_hash" "$archive" | sha256sum -c -; \
      gzip -dc "$archive" > "${engine_cache}/${cache_name}"; \
      printf '%s  %s\n' "$uncompressed_hash" "${engine_cache}/${cache_name}" | sha256sum -c -; \
      printf '%s' "$uncompressed_hash" > "${engine_cache}/${cache_name}.sha256"; \
      printf '%s' "$compressed_hash" > "${engine_cache}/${cache_name}.gz.sha256"; \
      chmod 0755 "${engine_cache}/${cache_name}"; \
      rm -f "$archive"; \
    }; \
    fetch_engine "libquery_engine.so.node.gz" "libquery-engine"; \
    fetch_engine "schema-engine.gz" "schema-engine"; \
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
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
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
