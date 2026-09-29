## Why

The backend has foundational security (Helmet, Argon2, httpOnly cookies, rate limiting, Zod validation) but lacks several OWASP Top 10 controls required for a fintech handling multi-currency transactions. Closing these gaps reduces attack surface and is a prerequisite for production compliance.

## What Changes

### OWASP A01: Broken Access Control
- ✅ Already implemented: Guards, refresh token rotation, theft detection with version counter

### OWASP A02: Cryptographic Failures
- ✅ Already implemented: Argon2 hashing, httpOnly + Secure + SameSite cookies, Helmet headers
- ➕ Add explicit Content-Security-Policy header in Helmet configuration

### OWASP A03: Injection
- ✅ Already implemented: Prisma ORM prevents SQL injection, no raw queries (`$queryRaw`/`$executeRaw`) found
- No changes needed

### OWASP A05: Security Misconfiguration
- ✅ Already implemented: Helmet, CORS with whitelist, Zod env validation with fail-fast, rate limiting (60 req/min)

### OWASP A06: Vulnerable & Outdated Components
- ❌ Missing: No dependency audit process
- ➕ Add `npm run audit` script with `npm audit --audit-level=high`
- ➕ Add `snyk` or `npm audit` to CI pipeline (future)

### OWASP A07: Identification & Authentication Failures
- ✅ Already implemented: JWT with refresh rotation, session management, rate limiting, 2FA, password recovery with OTP, theft detection with grace period

### OWASP A08: Software & Data Integrity Failures
- ❌ Missing: No lockfile integrity verification, no supply chain security checks
- ➕ Add `npm run audit` step (covers this partially)

### OWASP A09: Security Logging & Monitoring
- ✅ Already implemented: Logger with security events (theft detection, failed logins, 2FA attempts), Pino structured logging

### CSRF (Cross-Site Request Forgery)
- ❌ Missing: No CSRF protection
- ➕ Implement CSRF guard with double-submit cookie pattern using `csrf-csrf`
- ➕ Add `GET /auth/csrf-token` endpoint: generates signed cookie + returns token in JSON body for SPA
- ➕ CSRF Guard supports exclude routes config (for webhooks from payment gateways)
- ➕ Skip in e2e tests via `CSRF_ENABLED` env flag

## Capabilities

### New Capabilities
- `csrf-protection`: Double-submit cookie CSRF guard for state-changing endpoints

### Modified Capabilities
- `http-security-headers`: CSP added to Helmet configuration

## Impact

- **Dependencies**: `csrf-csrf` package
- **Middleware**: CSRF guard applied globally with `@SkipCsrf()` decorator for webhooks, token endpoint in AuthController
- **Config**: Add `CSRF_ENABLED` (boolean, default true), `CSRF_SECRET` (string) to Zod env schema
- **Helmet**: CSP configured with `defaultSrc: ["'none'"]` (API-only, no assets served)
- **Frontend**: SPA fetches token from `GET /auth/csrf-token`, stores in memory, sends `X-CSRF-Token` header on mutations
- **Testing**: Update e2e setup to disable CSRF
