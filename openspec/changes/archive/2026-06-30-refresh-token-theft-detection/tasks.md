## 1. Schema & Migration

- [ ] 1.1 Add `refreshTokenVersion Int @default(0)` to Session model in schema.prisma
- [ ] 1.2 Run `prisma migrate dev --name add-refresh-token-version`
- [ ] 1.3 Run `prisma generate`

## 2. Session Interfaces & Service

- [ ] 2.1 Add `refreshTokenVersion` to CreateSessionInterface and UpdateSessionInterface
- [ ] 2.2 Update SessionService.update() to handle `refreshTokenVersion`

## 3. Token Generation

- [ ] 3.1 Add `version: number` parameter to `SessionTokenService.generateTokens()`
- [ ] 3.2 Include `version` in the refresh token JWT payload
- [ ] 3.3 Pass `version: 0` from `createSessionWithTokens()`

## 4. Refresh Strategy

- [ ] 4.1 Add `version` to RefreshStrategy validate() return type and payload destructuring
- [ ] 4.2 Default `version` to 0 if not present in JWT (backward compat for existing sessions)

## 5. Theft Detection

- [ ] 5.1 In auth.service.refresh(): compare JWT version against DB version
- [ ] 5.2 If mismatch outside grace period (> 2s from `session.updatedAt`): delete session, clear cookies, log security warning, throw UnauthorizedException
- [ ] 5.2.b If mismatch inside grace period (≤ 2s from `session.updatedAt`): throw generic UnauthorizedException WITHOUT deleting session or clearing cookies
- [ ] 5.3 If match: increment version atomically with hash update

## 6. Tests

- [ ] 6.1 Update auth.service.spec.ts: add test cases for absolute theft detection AND concurrent grace period bypass
- [ ] 6.2 Update session.service.spec.ts: handle version in mock
- [ ] 6.3 Run unit tests (179 should pass)
- [ ] 6.4 Run e2e tests (35 should pass)
