## ADDED Requirements

### Requirement: Database layer provides centralized Prisma access

The system SHALL provide a dedicated `DatabaseModule` in `src/database/` that exports `DatabaseService` (renamed from `PrismaService`) for all database access across the application.

#### Scenario: DatabaseService extends PrismaClient
- **WHEN** the application bootstraps
- **THEN** `DatabaseService` SHALL extend PrismaClient and connect on module init
- **AND** `DatabaseModule` SHALL export `DatabaseService` as a global provider

#### Scenario: DatabaseService has correct logger name
- **WHEN** `DatabaseService` logs messages
- **THEN** the logger context SHALL be `"DatabaseService"` (not `"Auth - App"`)

#### Scenario: Existing tests continue working
- **WHEN** a test imports `DatabaseModule`
- **THEN** the test SHALL be able to mock `DatabaseService`
- **AND** the mock structure SHALL match the current `PrismaService` mock pattern

### Requirement: External integrations are isolated in src/integrations/

The system SHALL provide a dedicated `IntegrationsModule` in `src/integrations/` that registers adapters for all external services. Each adapter SHALL implement a port interface defined in its consuming domain module.

#### Scenario: Email adapter replaces direct Resend instantiation
- **WHEN** `EmailsService` needs to send an email
- **THEN** it SHALL inject an `EmailSender` interface (port)
- **AND** the `ResendAdapter` in `src/integrations/resend/` SHALL implement that interface
- **AND** the adapter SHALL be registered via a custom NestJS provider token

#### Scenario: Exchange rate adapter validates config via Zod
- **WHEN** `ExchangeRateService` fetches rates
- **THEN** `EXCHANGE_RATE_API_KEY` SHALL be read from `envs.ts` (validated by Zod)
- **AND** the HTTP call SHALL go through the centralized HTTP client

#### Scenario: ReCAPTCHA adapter validates config via Zod
- **WHEN** `RecaptchaGuard` verifies a token
- **THEN** `RECAPTCHA_SECRET_KEY` and `RECAPTCHA_THRESHOLD` SHALL be read from `envs.ts`
- **AND** the HTTP call SHALL go through the centralized HTTP client

#### Scenario: Geolocation adapter uses HTTPS
- **WHEN** `GeolocationService` fetches location data
- **THEN** the request SHALL use HTTPS (not HTTP)
- **AND** the HTTP call SHALL go through the centralized HTTP client

### Requirement: Centralized HTTP client for all outbound requests

The system SHALL provide a centralized HTTP client in `src/integrations/http/` that wraps `fetch()` with exponential backoff retry, configurable timeout, and structured request/response logging.

#### Scenario: HTTP client retries on failure
- **WHEN** an HTTP request fails with a 5xx status
- **THEN** the client SHALL retry up to 3 times with exponential backoff
- **AND** SHALL NOT retry on 4xx status codes

#### Scenario: HTTP client supports configurable timeout
- **WHEN** an HTTP request exceeds the configured timeout
- **THEN** the client SHALL abort with `AbortSignal.timeout()`
- **AND** SHALL log the timeout error

#### Scenario: HTTP client logs all requests
- **WHEN** an HTTP request is made
- **THEN** the client SHALL log the method, URL, status code, and duration
- **AND** SHALL NOT log request/response bodies (to avoid leaking sensitive data)

### Requirement: Prisma Multi-Schema prepared for domain isolation

The Prisma schema SHALL explicitly annotate all models with `@@schema("public")` and configure the datasource to support multiple PostgreSQL schemas for future domain isolation.

#### Scenario: All existing models have @@schema("public")
- **WHEN** the Prisma schema is generated
- **THEN** every existing model SHALL include `@@schema("public")`
- **AND** the datasource SHALL include `schemas = ["public"]`

#### Scenario: Migration is a no-op
- **WHEN** `prisma migrate dev` is run
- **THEN** no actual database changes SHALL occur
- **AND** the migration SHALL be empty (models remain in `public`)

### Requirement: All process.env reads use Zod-validated envs

The system SHALL validate ALL environment variables through the Zod schema in `envs.ts`. Direct `process.env` reads SHALL be removed from service files.

#### Scenario: EXCHANGE_RATE_API_KEY validated in envs.ts
- **WHEN** the application starts
- **THEN** `EXCHANGE_RATE_API_KEY` SHALL be validated by Zod in `envs.ts`
- **AND** `ExchangeRateService` SHALL read it from the envs object, not `process.env`

#### Scenario: RECAPTCHA variables validated in envs.ts
- **WHEN** the application starts
- **THEN** `RECAPTCHA_SECRET_KEY` and `RECAPTCHA_THRESHOLD` SHALL be validated by Zod in `envs.ts`
- **AND** `RecaptchaGuard` SHALL read them from the envs object, not `process.env`

#### Scenario: FRONTEND_URL validated in envs.ts
- **WHEN** the application starts
- **THEN** `FRONTEND_URL` SHALL be validated by Zod in `envs.ts`
- **AND** `AuthController` SHALL read it from the envs object, not `process.env`

### Requirement: IdempotencyInterceptor correctly named and placed

The `IdempotencyInterceptor` (formerly `IdempotencyGuard`) SHALL live in `src/common/interceptors/` and implement `NestInterceptor` with the correct name.

#### Scenario: IdempotencyInterceptor is in correct directory
- **WHEN** the codebase is inspected
- **THEN** the idempotency file SHALL exist at `src/common/interceptors/idempotency.interceptor.ts`
- **AND** SHALL NOT exist at `src/common/guards/idempotency.guard.ts`

#### Scenario: Idempotent decorator references new location
- **WHEN** `@Idempotent()` decorator is used
- **THEN** it SHALL import from `common/interceptors/idempotency.interceptor`
- **AND** all existing imports SHALL be updated
