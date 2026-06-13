# PayFlow

Financial simulation platform built with NestJS. Multi-currency wallets, virtual cards, simulated investments, and full authentication.

## Stack

- **NestJS** + TypeScript — framework core
- **PostgreSQL** + **Prisma ORM** — data layer
- **Redis** + **Keyv** — token caching, OTP expiry, rate limiting
- **Passport.js** + JWT — authentication with access/refresh token rotation
- **Docker** — local development environment

## Quick Start

```bash
# Start services
docker compose up -d

# Install dependencies
pnpm install

# Run migrations
pnpm prisma:migrate:dev

# Seed database
pnpm prisma:seed

# Start development server
pnpm start:dev
```

Then visit `http://localhost:3000/api/docs` for Swagger.

## Architecture

### Module Structure

```
src/modules/
├── auth/          # Authentication, 2FA, sessions, password recovery
├── users/         # User CRUD and profile
├── wallet/        # Multi-currency wallet (optimistic locking, idempotency)
├── transaction/   # Immutable transaction records
├── investment/    # Simulated asset portfolio
├── card/          # Virtual card management
├── webhook/       # Webhook dispatch with retry + HMAC verification
├── session/       # Session lifecycle (create, rotate, revoke)
├── tokens/        # Token generation and OTP validation
├── hash/          # Password hashing (Argon2 / bcrypt)
├── emails/        # Transactional email integration
└── prisma/        # Database service provider
```

### Key Decisions

| Decision | Rationale |
|---|---|
| **Optimistic locking** on wallet balance | Prevents race conditions without pessimistic locks, version column tracks concurrency |
| **Idempotency guard** (`IdempotentKey`) | Replay-safe financial operations — same key returns cached result |
| **Refresh token rotation** | Each refresh invalidates the previous token, preventing token reuse if compromised |
| **E2E with mock Prisma** | Override `PrismaService` with `mockPrisma` — full NestJS module graph runs but the database is a mock, enabling fast deterministic tests |
| **2FA rate limiting** | In-memory sliding window (5 attempts / 15 min) per user |
| **Session-based auth** | Access tokens reference DB sessions — revoke a session and access is cut immediately, no JWT expiry wait |

### Testing

Two layers:

**Unit tests** (`*.spec.ts`) — co-located with source files. Services tested with `Test.createTestingModule` overrides.

**E2E tests** (`e2e/*.e2e-spec.ts`) — full NestJS application with real middleware, guards, pipes, and filters. Database is replaced with `mockPrisma`:

```ts
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideProvider(PrismaService)
  .useValue(mockPrisma)
  .compile();
```

No database needed — each test sets up Prisma mock return values in `beforeEach`. Auth guards rely on mocked session lookups.

### Service Layer

`auth.service.ts` was refactored into focused services:

| Service | Responsibility |
|---|---|
| `AuthService` | register, login, refresh, googleLogin, logout |
| `SessionTokenService` | JWT generation, session creation, cookie management |
| `TwoFactorService` | 2FA generate/enable/disable/verify, backup codes, rate limiting |
| `PasswordRecoveryService` | forgot-password, verify-otp, reset-password |

## Commands

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Prisma
pnpm prisma:generate    # Generate client after schema change
pnpm prisma:migrate:dev # Apply migrations
pnpm prisma:seed        # Seed demo data
pnpm prisma:studio      # Database GUI

# Webhook demo
pnpm webhook:demo       # Runs local webhook receiver + deposit flow
```

## Environment

Copy `.env.example` to `.env`. Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_ACCESS_SECRET` | Access token signing key |
| `JWT_REFRESH_SECRET` | Refresh token signing key |
| `FRONTEND_URL` | CORS origin (default: `http://localhost:3001`) |

## Deployment

- **Backend**: Railway (Dockerfile)
- **Frontend**: Vercel (Next.js with API rewrites to Railway)
- **Database**: Railway PostgreSQL
- **Cache**: Railway Redis (Upstash)
