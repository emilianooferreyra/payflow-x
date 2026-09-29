## 1. Database Layer — src/database/

- [ ] 1.1 Create `src/database/` directory with `database.module.ts` and `database.service.ts` (move from `modules/prisma/`)
- [ ] 1.2 Fix Logger name in DatabaseService from "Auth - App" to "DatabaseService"
- [ ] 1.3 Update `DatabaseModule` to be `@Global()` so individual modules don't need to import it
- [ ] 1.4 Update ALL imports across the codebase: `PrismaService` → `DatabaseService`, `PrismaModule` → `DatabaseModule`
- [ ] 1.5 Update all test mocks referencing old PrismaService path
- [ ] 1.6 Run full test suite to verify

## 2. Config Consistency — envs.ts + process.env cleanup

- [ ] 2.1 Add `EXCHANGE_RATE_API_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_THRESHOLD`, `FRONTEND_URL` to `envs.ts` Zod schema
- [ ] 2.2 Update `ExchangeRateService` to read API key from `envs` instead of `process.env`
- [ ] 2.3 Update `RecaptchaGuard` to read keys/threshold from `envs` instead of `process.env`
- [ ] 2.4 Update `AuthController` to read `FRONTEND_URL` from `envs` instead of `process.env`
- [ ] 2.5 Add new env vars to `.env.template` and e2e `setup-env.js`
- [ ] 2.6 Run full test suite

## 3. Centralized HTTP Client — src/integrations/http/

- [ ] 3.1 Create `src/integrations/http/http-client.ts` with fetch wrapper, retry (3x exponential backoff), timeout (AbortSignal), and structured logging
- [ ] 3.2 Replace raw `fetch()` in `ExchangeRateService` with HTTP client
- [ ] 3.3 Replace raw `fetch()` in `RecaptchaGuard` with HTTP client
- [ ] 3.4 Replace raw `fetch()` in `GeolocationService` with HTTP client (change HTTP → HTTPS)
- [ ] 3.5 Replace raw `fetch()` in `WebhookService` with HTTP client
- [ ] 3.6 Run full test suite

## 4. Integration Adapters — src/integrations/

- [ ] 4.1 Create `src/integrations/integrations.module.ts` that exports all adapters
- [ ] 4.2 Extract Resend client behind `EmailSender` port interface; create `ResendAdapter` in `src/integrations/resend/`
- [ ] 4.3 Update `EmailsModule` to use DI-injected `EmailSender` instead of `new Resend()`
- [ ] 4.4 Create `src/integrations/exchange-rate/exchange-rate.adapter.ts` implementing port interface from `ExchangeRateModule`
- [ ] 4.5 Create `src/integrations/geolocation/geolocation.adapter.ts` implementing port interface from `AuthModule`
- [ ] 4.6 Register all adapters in `IntegrationsModule` via custom providers (injection tokens)
- [ ] 4.7 Run full test suite

## 5. Prisma Multi-Schema — @@schema() annotations

- [ ] 5.1 Add `schemas = ["public"]` to the `datasource db` block in `prisma/schema.prisma`
- [ ] 5.2 Add `@@schema("public")` to EVERY model in `prisma/schema.prisma`
- [ ] 5.3 Run `prisma migrate dev --name add_schema_annotations` and verify it produces an empty migration
- [ ] 5.4 Run full test suite

## 6. IdempotencyInterceptor — rename and relocate

- [ ] 6.1 Move `src/common/guards/idempotency.guard.ts` → `src/common/interceptors/idempotency.interceptor.ts` (rename class + file)
- [ ] 6.2 Update `@Idempotent()` decorator to import from new location
- [ ] 6.3 Update all references to `IdempotencyGuard` across the codebase
- [ ] 6.4 Run full test suite

## 7. Verification

- [ ] 7.1 Run `tsc --noEmit` to check for type errors
- [ ] 7.2 Run full `jest` suite — all tests passing
- [ ] 7.3 Verify no remaining hardcoded `process.env` reads outside `envs.ts`
