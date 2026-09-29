# Tasks: Auth Enhancements — Apple OAuth + ReCAPTCHA + Geolocation

**Implementation order (risk mitigation):** Prisma → ReCAPTCHA (fast, immediately secures endpoints) → Geolocation (async) → Apple OAuth (most complex, needs Apple Developer Console)

## Phase 1: Prisma & Dependencies

- [x] 1.1 Add APPLE to AuthProviderEnum in schema.prisma
- [x] 1.2 Review migration SQL with `prisma migrate dev --create-only` before applying
- [x] 1.3 Run `pnpm prisma generate`
- [x] 1.4 Install `passport-apple` package
- [x] 1.5 Install `@nestjs/event-emitter` (if not present)

## Phase 2: ReCAPTCHA Guard

- [x] 2.1 Create `src/modules/auth/guards/recaptcha.guard.ts`
  - Calls Google siteverify API
  - Environment-aware: `NODE_ENV=production` + missing keys → fail-fast throw
  - Non-production + missing keys → bypass with logger warning
  - Score threshold configurable via `RECAPTCHA_THRESHOLD` (default 0.5)
  - Local IP detection (::1, 127.0.0.1) → auto-bypass (Google siteverify errors on local requests)
- [x] 2.2 Apply `@UseGuards(RecaptchaGuard)` on POST /auth/register and POST /auth/login in controller
- [x] 2.3 Add optional `recaptchaToken` field to login and register DTOs

## Phase 3: IP Geolocation (Async via EventEmitter)

- [x] 3.1 Import `EventEmitterModule` in `src/app.module.ts`
- [x] 3.2 Create `src/modules/auth/geolocation/geolocation.service.ts`
  - Resolve IP → location via ip-api.com
  - Cache in Redis with 1h TTL
  - Private IP detection → return "Local network" without API call
  - Graceful degradation: try/catch → log error → null
- [x] 3.3 Create `src/modules/auth/geolocation/geolocation.listener.ts`
  - `@OnEvent('session.created')`
  - Calls GeolocationService.resolve(ip)
  - Updates session.location in DB
  - **Critical**: try/catch wrapping the entire handler — unhandled rejections in EventEmitter listeners can crash the process
- [x] 3.4 Modify `src/modules/session/session.service.ts`
  - Inject EventEmitter
  - Emit `session.created` with `{ sessionId, ip }` after session creation
  - Do NOT await the geo-resolve
- [x] 3.5 Register GeolocationService + GeolocationListener in `AuthModule`

## Phase 4: Apple OAuth

- [x] 4.1 Create `src/modules/auth/strategies/apple.strategy.ts`
  - Passport strategy with `passport-apple`
  - `getOrGenerateClientSecret()` — signs ES256 JWT with .p8 key, caches in memory
  - Auto-renew before expiry (check on each request)
  - Graceful disable if env vars missing
- [x] 4.2 Create `src/modules/auth/guards/apple-auth.guard.ts` — AuthGuard("apple") wrapper
- [x] 4.3 Add `appleLogin()` method to `AuthService` (mirrors `googleLogin()`)
- [x] 4.4 Add GET /auth/apple and GET+POST /auth/apple/callback to `AuthController`
  - Apple uses `form_post` response mode → sends POST, not GET. Both verbs MUST point to the same handler
- [x] 4.5 Register AppleStrategy in `AuthModule`

## Phase 5: Config & Verification

- [x] 5.1 Add all env vars to `.env.example`:
  - `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY_PATH`, `APPLE_CALLBACK_URL`
  - `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_THRESHOLD`
- [x] 5.2 Run `pnpm tsc --noEmit` and fix errors
- [x] 5.3 Run `pnpm test` and verify existing auth tests still pass
