# Technical Design

## Architecture

### Health Module (`src/modules/health/`)
- `HealthModule` — imports `TerminusModule` + `PrismaModule`, registers controller and indicators
- `HealthController` — `GET /health` → `@HealthCheck()` decorator
- `PrismaHealthIndicator` — runs `prisma.$queryRaw\`SELECT 1\``
- `RedisHealthIndicator` — uses dedicated `redis` client (separate from Cache's KeyvRedis), pings on each check

### Shutdown Hooks
- `app.enableShutdownHooks()` in `main.ts` — NestJS listens for SIGTERM/SIGINT
- `PrismaService` already implements `OnModuleDestroy` with `this.$disconnect()` → no changes needed

## Dependencies
- `@nestjs/terminus` — health check decorators and base class
- `redis` — direct dependency for Redis health check (already transitive via `@keyv/redis`)

## URL
`GET /api/v1/health` — under global prefix `api` + URI versioning `v1`

## Response Format
Standard Terminus `HealthCheckResult`:
- `status`: `"ok"` (all up), `"error"` (any down), `"shutting_down"`
- `info`: healthy services
- `error`: unhealthy services
- `details`: combined
