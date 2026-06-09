# ============================================
# BASE — shared deps
# ============================================
FROM node:22-alpine AS base

RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@10

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ============================================
# DEV — source mounted at runtime via volume
# ============================================
FROM base AS dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && pnpm run start:dev"]

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

RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm@10

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts && \
    pnpm rebuild argon2

# ============================================
# PROD — lean runtime image
# ============================================
FROM node:22-alpine AS prod

RUN npm install -g pnpm@10

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/dist ./dist
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/prisma ./prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

CMD ["sh", "-c", "npx prisma generate && node dist/main.js"]
