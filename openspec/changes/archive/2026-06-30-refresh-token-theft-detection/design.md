## Context

Refresh tokens currently rotate (old hash overwritten with new on each refresh) but have no theft detection. An attacker who steals a valid refresh token can use it before the legitimate user, and the system treats the legitimate user's subsequent attempt as a generic "invalid token" error — no session invalidation, no audit trail.

The existing flow uses a single `refreshToken` hash per session in PostgreSQL. The JWT payload contains `{ sub, sessionId }`. The refresh strategy validates the JWT signature, then the service compares the plaintext token against the stored hash.

## Goals / Non-Goals

**Goals:**
- Detect refresh token reuse (the same JWT used twice)
- Invalidate the compromised session on suspicion of theft
- Minimize schema changes and migration complexity
- Maintain backward compatibility for active sessions

**Non-Goals:**
- Real-time alerting or notification to the user (future)
- IP-based anomaly detection for refresh (future)
- Hardware-backed tokens or passkeys

## Decisions

### Decision: Version counter vs. previous-token hash

**Chosen: Version counter** (`refreshTokenVersion Int @default(0)`)

| Approach | Pros | Cons |
|----------|------|------|
| Version counter | Simple int, easy to audit, no extra storage | Requires migration |
| Store previous hash | Can identify WHICH token was reused | More storage, complex cleanup, overkill for MVP |

The version counter provides clear theft detection with minimal complexity. Each rotation atomically increments the version. If the JWT's version doesn't match the DB, the token was issued for a different rotation cycle → theft.

### Decision: Include version in both tokens vs. only refresh token

**Chosen: Both tokens.** The access token payload already mirrors the refresh token payload `{ sub, sessionId }`. Adding `version` to both is consistent and costs nothing. The version is only checked during refresh (access tokens are stateless), but having it in both simplifies the generation code.

### Decision: Delete session vs. mark inactive on theft

**Chosen: Delete session.** Simpler, immediate invalidation, no cleanup job needed. The user will need to re-authenticate. For a fintech, this is the correct security posture — a suspected compromised session should be eliminated, not left in limbo.

### Decision: Grace Period for Mismatch vs. Immediate Destructive Deletion

**Chosen: Time-gated Mismatch (Grace Period)**

| Approach | Pros | Cons |
|----------|------|------|
| Time-gated Mismatch | Eliminates false positives from React StrictMode or mobile network retries. Safe UX. | Requires reading `updatedAt` before deleting. |
| Immediate Deletion | Dead simple logic. | High risk of logging out legitimate users on unstable connections. |

To prevent concurrent requests from destroying valid sessions, a version mismatch will only trigger the **Theft Protocol (Session Deletion)** if `currentTime - session.updatedAt > 2000ms`. If it's within 2 seconds, the system returns a standard `UnauthorizedException` without wiping out the user's active session.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Race condition: two simultaneous valid refresh requests from same client cause false theft detection | When a version mismatch occurs, check the session's `updatedAt` timestamp. If the session was updated within a "Grace Period" (e.g., < 2 seconds) AND the token is a duplicate, treat it as a concurrent network glitch. Reject the second request with a generic 401 but **DO NOT delete the session**. If the mismatch occurs outside this window, execute the full theft protocol. |
| Migration adds a non-nullable column to a table with existing rows | Add with `@default(0)` — zero-downtime, existing sessions get version 0 which matches their existing JWTs (which don't have a version field — legacy tokens will lack the claim). Need to handle: if JWT has no `version` claim, treat as version 0 (backward compat). |
| Existing sessions in progress will have refresh tokens without version in JWT | In `refresh.strategy.ts`, default `version` to 0 if not present in payload. This means pre-migration tokens are treated as version 0, which will match the DB default of 0 on first refresh. The version will then increment to 1. |

## Migration Plan

1. Add `refreshTokenVersion Int @default(0)` to Prisma schema
2. Run `prisma migrate dev --name add-refresh-token-version`
3. Run `prisma generate`
4. Deploy code changes (backward compatible — see risk #3 mitigation)
