## 1. SessionTokenService Tests

- [x] 1.1 Create `session-token.service.spec.ts` with mock setup (SessionService, JwtService, HashService)
- [x] 1.2 Test `generateTokens` — verifies jwtService.sign and jwtService.signAsync are called with correct payload
- [x] 1.3 Test `createSessionWithTokens` success path — sessionService.create → generateTokens → hash → sessionService.update → setTokenCookies
- [x] 1.4 Test `createSessionWithTokens` failure path — sessionService.create throws → BadRequestException
- [x] 1.5 Test `setTokenCookies` — res.cookie called with access_token and refresh_token with httpOnly flags
- [x] 1.6 Test `clearTokenCookies` — res.clearCookie called for both tokens

## 2. WebhookService Tests

- [x] 2.1 Create `webhook.service.spec.ts` with mock setup (mockPrisma, global.fetch)
- [x] 2.2 Test `dispatch` with active endpoints — fetches endpoints, signs payload, posts to each, creates delivery record
- [x] 2.3 Test `dispatch` with no endpoints — no HTTP calls, no delivery records
- [x] 2.4 Test HMAC-SHA256 signature — X-Webhook-Signature header matches computed HMAC
- [x] 2.5 Test delivery status DELIVERED on 2xx response
- [x] 2.6 Test delivery status PENDING_RETRY on failure/exception
