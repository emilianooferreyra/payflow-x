## Why

SessionTokenService and WebhookService are critical to the auth and payment flows but lack unit test coverage. SessionTokenService handles JWT signing, session creation, and cookie management — any regression there breaks login, register, 2FA, and token refresh. WebhookService dispatches financial event notifications with retry logic; undetected bugs could cause silent delivery failures. Adding unit tests for these two services improves confidence and catches regressions early.

## What Changes

- Add unit tests for `SessionTokenService` covering token generation, session creation with tokens, cookie management
- Add unit tests for `WebhookService` covering dispatch, retry logic, HMAC signing, delivery status tracking
- No production code changes — existing behavior is correct, tests only

## Capabilities

### New Capabilities
- `session-token-service`: Unit tests for SessionTokenService (generateTokens, createSessionWithTokens, setTokenCookies, clearTokenCookies)
- `webhook-service`: Unit tests for WebhookService (dispatch with endpoints, HMAC signing, retry scheduling, delivery record creation)

### Modified Capabilities

None — tests only, no spec-level behavior changes.

## Impact

- **Affected code**: `src/modules/auth/session-token.service.ts`, `src/modules/webhook/webhook.service.ts`
- **New files**: `src/modules/auth/session-token.service.spec.ts`, `src/modules/webhook/webhook.service.spec.ts`
- **Dependencies**: No new dependencies. Tests follow existing patterns (mockPrisma, Test.createTestingModule overrides)
- **No API or production code changes**
