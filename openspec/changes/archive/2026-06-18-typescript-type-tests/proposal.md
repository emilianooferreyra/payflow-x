# Proposal: TypeScript Advanced Types — Phase 2

## Intent

We completed Phase 1 (utility types: `assertFound`, `isCurrencyEnum`, `CurrentUser<T>`, `satisfies`, discriminated union, derived interfaces). Now we apply the TypeScript Advanced Types skill's remaining patterns to the codebase: template literal types, typed API clients, `unknown` over `any`, and type tests for our new utilities.

## Scope

### In Scope
- **Type Testing**: `AssertEqual<T,U>` + compile-time tests for all Phase 1 utilities
- **Template Literal Types**: KYC documentType/action unions, AuthorizationTokenEnum string enum, two-factor-pending `type` literal
- **Typed API Client**: Exchange rate API response interface + fetch helper
- **Google OAuth `any` → typed interfaces**: `GoogleProfile` + `GoogleUser`
- **Untyped Express `res` parameters**: 6+ params in auth services typed as `Response`
- **Untyped `req` in refresh strategy**: typed as express `Request`

### Out of Scope
- Type-Safe Event Emitter (no existing pattern in codebase)
- Type-Safe API Client for webhook delivery (dynamic URLs, user-configured)
- Builder pattern (no complex object construction that needs it)

## Approach

6 independent phases, each verifying with `npx tsc --noEmit`:

1. **Type Testing** — `src/__type-tests__/index.ts` with `AssertEqual` + `@ts-expect-error`
2. **Template Literals** — shared types for KYC, string enum for tokens, literal for 2FA
3. **Typed API Client** — `ExchangeRateApiResponse` interface + typed `res.json()`
4. **Google OAuth types** — `GoogleProfile` + `GoogleUser` interfaces
5. **Express types** — `res: Response`, `req: Request` in strategies/services
6. **Final verification** — `tsc`, tests, `: any` count

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__type-tests__/index.ts` | New | All compile-time type assertions |
| `src/modules/kyc/dto/submit-kyc.dto.ts` | Modified | DocumentType as literal union |
| `src/modules/kyc/dto/review-kyc.dto.ts` | Modified | Action as shared literal type |
| `src/common/enums/authorization-token.enum.ts` | Modified | Numeric → string enum |
| `src/modules/auth/strategies/two-factor-pending.strategy.ts` | Modified | `type: "2fa_pending"` literal |
| `src/modules/exchange-rate/exchange-rate.service.ts` | Modified | Typed API response |
| `src/modules/auth/strategies/google.strategy.ts` | Modified | `GoogleProfile` type |
| `src/modules/auth/auth.service.ts` | Modified | `GoogleUser` type + `res: Response` |
| `src/modules/auth/session-token.service.ts` | Modified | `res: Response` |
| `src/modules/auth/two-factor.service.ts` | Modified | `res: Response` |
| `src/modules/auth/strategies/refresh.strategy.ts` | Modified | `req: Request` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Express Response type breaks cookie methods | Low | Express `Response` has `cookie()`, `clearCookie()`, `status()`, `json()` — same methods used |
| String enum changes break existing cache keys | Medium | Old numeric keys (`token0:user:x`) will miss cache on deploy — acceptable, cache repopulates |
| Exchange rate API response shape mismatch | Low | Interface only used for type assertion, runtime data unchanged |

## Rollback

Code only — 6 independent phases, revertible commit by commit.

## Success Criteria

- [ ] `npx tsc --noEmit` passes cleanly (zero errors)
- [ ] `npm test` — all tests pass
- [ ] `rg ': any' src/ -g '*.ts' -g '!*.spec.ts' -g '!generated/'` — only 0-2 remaining (Google OAuth `accessToken`/`refreshToken` params)
