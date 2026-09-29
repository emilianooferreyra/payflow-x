## Why

Refresh tokens currently rotate (old invalidated, new issued) but lack theft detection. If an attacker steals a refresh token and uses it first, the legitimate user gets a generic 401 with no way to know their session was compromised. This is a security gap for a fintech handling multi-currency transactions.

## What Changes

- Add `refreshTokenVersion` counter to the Session model (Prisma schema + migration)
- Include version in refresh token JWT payload
- On refresh: verify version matches DB → if mismatch, delete session (theft protocol)
- On refresh mismatch: enforce a 2-second grace period based on `updatedAt` to prevent concurrent network retries from wiping active sessions
- On refresh: increment version on successful rotation
- Emit security event on suspected theft

## Capabilities

### New Capabilities
- `refresh-theft-detection`: Version-gated refresh token rotation with automatic session invalidation on detected reuse, protected by a time-gated concurrency window to eliminate false positives.

### Modified Capabilities
<!-- No existing spec changes — this is entirely new behavior -->

## Impact

- **Schema**: `Session.refreshTokenVersion` (Int, default 0)
- **Backend**: `auth.service.ts` (grace-period & refresh logic), `refresh.strategy.ts` (JWT payload), `session-token.service.ts` (token generation), `session.service.ts` (update interface)
- **Testing**: Update auth.service.spec, session.service.spec; add e2e coverage
