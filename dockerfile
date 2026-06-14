# ============================================
# BASE — shared deps
# ============================================
FROM node:22-alpine AS base

RUN npm install -g pnpm@10 && npm cache clean --force

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile && \
    pnpm store prune && \
    apk del python3 make g++

# ============================================
# BUILD — compile for production
# ============================================
FROM base AS build

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN pnpm run build

# ============================================
# PROD DEPS — production-only dependencies
# ============================================
FROM node:22-alpine AS prod-deps

RUN npm install -g pnpm@10 && npm cache clean --force

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN apk add --no-cache python3 make g++ && \
    pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm rebuild argon2 && \
    pnpm store prune && \
    apk del python3 make g++

# ============================================
# PROD — lean runtime image
# ============================================
FROM node:22-alpine AS prod

RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /usr/src/app

COPY --from=build --chown=appuser:appgroup /usr/src/app/dist ./dist
COPY --from=prod-deps --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /usr/src/app/package.json ./
COPY --from=build --chown=appuser:appgroup /usr/src/app/prisma ./prisma
COPY --chown=appuser:appgroup docker-entrypoint.sh /usr/local/bin/

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]

# ============================================
# DEV — source mounted at runtime via volume
# ============================================
FROM base AS dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD npx prisma generate && pnpm run start:dev
