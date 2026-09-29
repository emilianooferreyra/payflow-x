# Design: Auth Enhancements — Apple OAuth + ReCAPTCHA + Geolocation

## Technical Approach

Apple OAuth using `passport-apple` with cached client_secret JWT (Apple requires a signed JWT from .p8 key, not a static secret). ReCAPTCHA as a NestJS guard with environment-aware fail-fast. Geolocation via ip-api.com dispatched asynchronously via `@nestjs/event-emitter` to not block login response.

## Architecture Decisions

### Decision: ReCAPTCHA fail-fast in production

**Choice**: Validate env in guard constructor. If `NODE_ENV=production` and keys missing → throw on server start (fail-fast). If not production → bypass.
**Rationale**: Silent bypass in production could let bots through undetected. Fail-fast forces proper configuration before deploy.
**Tradeoff**: Requires env var review before staging/prod deploy — which is the desired behavior.

### Decision: Geolocation via EventEmitter (true async)

**Choice**: Emit `session.created` event on login. A `@OnEvent('session.created')` listener resolves the IP async and updates `session.location` in the background.
**Alternatives**: Await geo-resolve inline (adds latency), fire-and-forget promise (unhandled rejections risk)
**Rationale**: Zero latency added to login response. Proper error boundaries via try/catch in the listener. NestJS EventEmitter is the idiomatic way.
**Tradeoff**: `session.location` is not immediately available after login response — it gets populated milliseconds later. The panel (Seguridad page) should handle `null` location gracefully.

### Decision: Apple client_secret with cached JWT

**Choice**: Generate the Apple client_secret JWT once (signed with .p8 private key), cache in memory/Redis with auto-renewal before expiry.
**Alternatives**: Generate on every request (CPU cost from RSA signing), hardcode static secret (doesn't exist for Apple)
**Rationale**: Apple uses ES256 JWT as client_secret — signing is expensive. Cache up to 6 months (Apple max). Renew automatically when approaching expiry.
**Tradeoff**: Slight complexity in managing JWT lifecycle, but avoids signing on every auth request.

### Decision: Prisma enum migration safety

**Choice**: Use `prisma migrate dev --create-only` to review generated SQL before applying, especially for enum modifications on production-like data.
**Rationale**: Adding a value to a PostgreSQL enum is non-blocking but it's good practice to review the migration SQL.
**Tradeoff**: Adds a manual step but prevents surprises.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add APPLE to AuthProviderEnum |
| `src/modules/auth/guards/recaptcha.guard.ts` | Create | ReCAPTCHA guard — fail-fast in production if misconfigured, bypass in dev |
| `src/modules/auth/dto/login.dto.ts` | Modify | Add optional `recaptchaToken` field |
| `src/modules/auth/dto/register.dto.ts` | Modify | Add optional `recaptchaToken` field |
| `src/modules/auth/auth.controller.ts` | Modify | Apply RecaptchaGuard on login/register routes |
| `src/modules/auth/strategies/apple.strategy.ts` | Create | Passport strategy — cached JWT signing for client_secret |
| `src/modules/auth/guards/apple-auth.guard.ts` | Create | AuthGuard("apple") wrapper |
| `src/modules/auth/auth.service.ts` | Modify | Add `appleLogin()` method |
| `src/modules/auth/auth.controller.ts` | Modify | Add GET /auth/apple and /auth/apple/callback |
| `src/modules/auth/auth.module.ts` | Modify | Register AppleStrategy + GeoService + EventEmitter |
| `src/modules/auth/geolocation/geolocation.service.ts` | Create | Resolve IP via ip-api.com with Redis cache |
| `src/modules/auth/geolocation/geolocation.listener.ts` | Create | Listener for `session.created` event — async geo-resolve |
| `src/modules/session/session.service.ts` | Modify | Emit `session.created` event after session creation |
| `src/app.module.ts` | Modify | Import EventEmitterModule |
| `.env.example` | Modify | Add all new env vars |

## Data Flow

```
POST /auth/register { email, password, recaptchaToken }

  1. RecaptchaGuard
     ├─ production + missing keys → throw (fail-fast)
     ├─ dev + missing keys → bypass
     └─ keys present → Google siteverify → score ≥ threshold? → pass : 403

  2. AuthService.register() → create user → create session

  3. SessionService.create()
     └─ emit('session.created', { sessionId, ip }) → non-blocking

  4. GeolocationListener (async, background)
     ├─ Redis cache hit? → use cached
     ├─ Cache miss? → ip-api.com → store in Redis 1h
     └─ Update session.location in DB
```

```
GET /auth/apple
  → AppleAuthGuard redirects to Apple

GET /auth/apple/callback?code=...
  → AppleStrategy.getOrGenerateClientSecret() → cached JWT
  → AppleStrategy exchanges code for tokens
  → AuthService.appleLogin() → find or create user → set session
```

## Implementation Order

1. Prisma enum + deps install (foundation)
2. ReCAPTCHA Guard (fastest to implement and test, immediately secures existing endpoints)
3. Geolocation async (EventEmitter + Redis cache)
4. Apple OAuth (requires Apple Developer Console setup — most complex, do last)

## Open Questions

None.
