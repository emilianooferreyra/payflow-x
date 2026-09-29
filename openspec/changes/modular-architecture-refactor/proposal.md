## Why

The codebase will grow significantly. Currently, infrastructure concerns (database, external integrations, HTTP clients) are scattered across domain modules, making it hard to swap implementations, test in isolation, and scale to multiple teams. We need a clear separation between domain logic and infrastructure, following Hexagonal Architecture principles, to keep the monolith maintainable as it expands.

## What Changes

- **BREAKING**: Create `src/database/` directory — move PrismaService and add repository pattern for data access
- **BREAKING**: Create `src/integrations/` directory — centralize all external service adapters (Resend, Exchange Rates, ReCAPTCHA, Geolocation, HTTP client)
- **BREAKING**: Add centralized HTTP client with retry, timeout, and logging
- **BREAKING**: Move all `process.env` access to Zod-validated `envs.ts` (EXCHANGE_RATE_API_KEY, RECAPTCHA_SECRET_KEY, RECAPTCHA_THRESHOLD, FRONTEND_URL)
- **BREAKING**: Extract ports (interfaces) in domain modules, adapters in `src/integrations/` — inject via NestJS DI tokens
- **BREAKING**: Configure Prisma Multi-Schema with `@@schema()` annotations — prepare for future domain isolation at DB level
- Fix copy-paste Logger name in PrismaService ("Auth - App" → "PrismaService")
- Relocate IdempotencyGuard from `common/guards/` to `common/interceptors/`

## Capabilities

### New Capabilities
- `database-layer`: Centralized database access with PrismaService, repository pattern, and connection lifecycle management
- `integrations-http`: Unified HTTP client with retry, timeout, structured logging for all outbound requests
- `integrations-email`: Email adapter (Resend) behind a port interface
- `integrations-exchange-rate`: Exchange rate provider adapter behind a port interface
- `integrations-recaptcha`: ReCAPTCHA verification adapter behind a port interface
- `integrations-geolocation`: IP geolocation adapter behind a port interface
- `prisma-multi-schema`: PostgreSQL schema-separated Prisma models for future domain isolation

### Modified Capabilities
- *(none — no existing specs are modified)*

## Impact

- **Modules**: All 18 domain modules — PrismaModule import path changes from `modules/prisma` to `database`
- **Config**: `envs.ts` gains 4 new validated variables; `process.env` direct reads removed from 3 files
- **Dependencies**: No new npm packages; `@nestjs/axios` optional (vanilla fetch wrapper preferred)
- **Database**: Prisma schema gets `@@schema()` annotations; existing tables stay in `public` schema
- **Tests**: All existing mocks of PrismaService must be updated to import from `database` not `modules/prisma`
