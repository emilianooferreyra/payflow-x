# AGENTS.md

PayPayPay backend: a multi-currency (ARS, USD, USDT, BRL) fintech API. NestJS 11, TypeScript, Prisma 7, PostgreSQL, Redis. Requests go to `/api/v1/*`; Swagger is at `/api/docs`.

This file holds what cannot be derived from reading the code. If something here contradicts the code, the code is right: fix this file.

## Commands

```bash
docker compose up -d          # Postgres + Redis (development overlay is the default)
pnpm install
npx prisma generate           # after any schema change; client lands in src/generated/prisma (never edit)
npx prisma migrate dev        # apply/create migrations
npx prisma db seed            # demo data
pnpm start:dev

pnpm typecheck                # tsc --noEmit
pnpm test                     # unit, colocated *.spec.ts
pnpm test:e2e                 # needs Postgres and Redis; specs live in e2e/
pnpm lint:ci
```

CI (`.github/workflows/ci.yml`) runs typecheck, unit and e2e. The production image is published to GHCR only from `main`, and only after those pass.

## Workflow

- **Every change goes through OpenSpec.** `openspec new change <name>`, then proposal, specs, design and tasks under `openspec/changes/<name>/`. No implementation before the plan is reviewed and approved. When done, archive the change so `openspec/specs/` stays current.
- **Strict TDD.** Write the failing test first and watch it fail, then the minimum code to pass, then clean up. Run the affected specs while iterating and the full suite before opening a PR.
- **One PR per change**, branched from `main` (`feat/`, `fix/`, `chore/`, `docs/`). Conventional commits. Keep unrelated cleanups out of the PR and list them as follow-ups instead.

## Rules

- **No `any`**, including specs and mocks (`as any` and `<any>` too). Enforcement is by convention only: ESLint `no-explicit-any` is off and `noImplicitAny` is false, so the tooling will not catch it. Existing usages are being removed gradually, mostly in specs.
- **Money is never a JS `number`.** Use `Money` from `src/shared/kernel/money.ts` in domain and application code. Prisma `Decimal` belongs to persistence; convert at the adapter boundary.
- **Money-moving transactions use `withOptimisticRetry`**: READ COMMITTED with a `version` column as compare-and-swap. Do not change the isolation level without an ADR.
- **Never call an external service inside a database transaction.**
- **Configuration goes through `src/config/envs.ts`** (Zod). Add every new variable there and to `.env.template`. Never commit `.env`.
- **Applied migrations are immutable.** Create a new one.
- **Tests:** colocated `*.spec.ts`, English test names. Reuse `src/common/testing` (`mockPrisma`, factories, `createTestingModule`).

## Architecture direction

The codebase is a modular monolith in layers (controller, service, Prisma) by default. That is a deliberate choice, not an accident.

Hexagonal architecture (`domain/`, `application/` with ports, `infrastructure/` with adapters) is being introduced incrementally, starting with `wallet` and `webhook` (see `openspec/changes/outbox-webhooks`). In a hexagonal module, `domain/` and `application/` must not import Prisma or `src/generated/prisma`. Other modules keep their current layout until a planned change migrates them; do not reorganize folders outside such a change.

Webhook delivery is being moved to a transactional outbox. Until that change is merged, events are dispatched directly after commit, which can lose events; do not build new features on top of that path.

## Docker and CI facts

- Compose is a shared base plus one overlay per environment. Production is selected explicitly with `-f docker-compose.yml -f docker-compose.prod.yml`. Never put dev-only ports or volumes in the base file: Compose merges lists, so they would leak into production.
- Two health endpoints on purpose: `/api/v1/health/live` (process only, used by the image `HEALTHCHECK`) and `/api/v1/health/ready` (database and Redis). The container healthcheck must not depend on Postgres or Redis.
- The production image runs `prisma migrate deploy` in `docker-entrypoint.sh` before serving traffic.
