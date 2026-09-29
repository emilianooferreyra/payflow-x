## Context

The codebase is a NestJS 11 modular monolith with 18 domain modules, all importing PrismaService from `src/modules/prisma/`. External integrations (Resend, Exchange Rates, ReCAPTCHA, Geolocation) are scattered across modules with raw `fetch()` calls and direct `process.env` access. There is no unified HTTP client, no port/adapter separation, and Prisma uses a single `public` schema.

## Goals / Non-Goals

**Goals:**
- Establish `src/database/` as the single source of truth for data access (PrismaService, repositories)
- Establish `src/integrations/` as the single source of truth for external service adapters
- Create port interfaces in domain modules, adapter implementations in `src/integrations/`
- Add centralized HTTP client with retry, timeout, and structured logging
- Move all `process.env` reads into Zod-validated `envs.ts`
- Configure Prisma Multi-Schema with `@@schema("public")` on all existing models
- Fix misnamed Logger and misplaced IdempotencyGuard

**Non-Goals:**
- Splitting into microservices (this prepares for it but does not do it)
- Changing the database schema or data
- Adding new features or endpoints
- Rewriting existing business logic

## Decisions

### Decision 1: Flat `src/database/` over `src/infrastructure/`
**Chosen**: `src/database/` (matches user's stated preference)
**Alternatives**: `src/infrastructure/database/` (too nested), keep in `modules/prisma/` (mixes domain with infrastructure)
**Rationale**: Database is a core infrastructure concern, not a domain module. Keeping it in `modules/` blurs the line between domain and infrastructure.

### Decision 2: Vanilla fetch wrapper over @nestjs/axios
**Chosen**: Lightweight fetch wrapper in `src/integrations/http/http-client.ts`
**Alternatives**: `@nestjs/axios/HttpService` (adds RxJS dependency), `axios` directly (another dependency)
**Rationale**: Node 18+ has stable `fetch`. A thin wrapper with retry logic (exponential backoff), timeout, and logging is simpler and has zero dependencies. RxJS adds complexity for a use case that's fundamentally imperative.

### Decision 3: NestJS custom providers over abstract factory
**Chosen**: Interface + Injection Token + `useClass` provider pattern
**Alternatives**: Abstract factory classes, manual service locator
**Rationale**: NestJS DI is already the standard. Using injection tokens (`EMAIL_SERVICE`, `EXCHANGE_RATE_PROVIDER`) keeps things testable and consistent with the rest of the codebase.

### Decision 4: `@@schema("public")` on all existing models
**Chosen**: Add explicit schema annotations to all Prisma models, pointing to `public`
**Alternatives**: Create new domain schemas and move tables (risky, breaking), keep everything in public (no preparation for future)
**Rationale**: Adding `@@schema("public")` to all existing models is a no-op at the database level (public is the default). It prepares the schema file for future domain schemas without any migration risk. New models can be placed in domain-specific schemas later.

### Decision 5: Keep Prisma single client, not multiple Prisma clients
**Chosen**: Single PrismaClient with multi-schema support
**Alternatives**: Multiple PrismaClients per schema (complex, cross-schema queries break)
**Rationale**: Prisma's multi-schema feature generates a single client that handles schema-prefixed queries transparently. Multiple clients would prevent cross-schema JOINs and increase complexity.

### Decision 6: Rename IdempotencyGuard → IdempotencyInterceptor, move to interceptors/
**Chosen**: Rename and relocate
**Alternatives**: Keep with incorrect name (misleading), add alias (technical debt)
**Rationale**: It implements `NestInterceptor` not `CanActivate`. Correct naming prevents confusion.

## Risks / Trade-offs

- **[Risk] All 18 modules and their tests import PrismaModule from `modules/prisma`** → Mitigation: Use find-and-replace across all files; run full test suite to catch any missed imports
- **[Risk] Moving files breaks git history** → Mitigation: Use `git mv` so file moves are tracked; do NOT copy-delete
- **[Risk] Multi-schema annotation might confuse Prisma migration engine** → Mitigation: Test with `prisma migrate dev` in a dry-run first; the `public` schema annotation is the default behavior, so it should be a no-op
- **[Risk] Port interfaces may be premature abstraction** → Mitigation: Start with the most volatile integrations (Exchange Rates, ReCAPTCHA) where providers change; keep simple ones (Resend) with direct DI until abstraction is justified
