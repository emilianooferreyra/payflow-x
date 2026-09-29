# Tasks: TypeScript Advanced Types — Phase 2

## Phase 1: Type Testing

- [x] **1.1** Create `src/__type-tests__/` directory with `AssertEqual<T, U>` utility
- [x] **1.2** Type tests for `assertFound<T>()` narrowing
- [x] **1.3** Type tests for `isCurrencyEnum()` type guard
- [x] **1.4** Type tests for `WebhookEvent` discriminated union (all 3 variants)
- [x] **1.5** Type tests for derived `UpdateUserInterface`
- [x] **1.6** Verify with `npx tsc --noEmit`

## Phase 2: Template Literal Types

- [x] **2.1** Create `src/modules/kyc/kyc.types.ts` with `DocumentType` and `KycReviewAction`
- [x] **2.2** Update DTOs and kyc.service.ts to import shared types
- [x] **2.3** Convert `AuthorizationTokenEnum` from numeric to string enum
- [x] **2.4** Fix `two-factor-pending.strategy.ts` — `type: "2fa_pending"` literal + remove runtime if
- [x] **2.5** Verify with `npx tsc --noEmit`

## Phase 3: Typed API Client

- [x] **3.1** Add `ExchangeRateApiResponse` interface to `exchange-rate.service.ts`
- [x] **3.2** Type the `res.json()` call
- [x] **3.3** Verify with `npx tsc --noEmit`

## Phase 4: Google OAuth types

- [x] **5.1** Define `GoogleProfile` and `GoogleUser` interfaces in `google.strategy.ts`
- [x] **5.2** Replace `profile: any` with `profile: GoogleProfile` + `satisfies GoogleUser`
- [x] **5.3** Replace `googleUser: any` with `googleUser: GoogleUser` in `auth.service.ts`
- [x] **5.4** Verify with `npx tsc --noEmit`

## Phase 5: Express types

- [x] **6.1** Add `res: Response` to `auth.service.ts` (register, refresh, googleLogin, logout)
- [x] **6.2** Add `res: Response` to `session-token.service.ts` (setTokenCookies, clearTokenCookies, createSessionWithTokens)
- [x] **6.3** Add `res: Response` to `two-factor.service.ts` (verifyTwoFactor)
- [x] **6.4** Add `req: Request` to `refresh.strategy.ts`
- [x] **6.5** Verify with `npx tsc --noEmit`

## Phase 6: Final verification

- [x] **7.1** `npx tsc --noEmit` — zero errors
- [x] **7.2** `npm test` — all tests pass
- [x] **7.3** `rg ': any' src/ -g '*.ts' -g '!*.spec.ts' -g '!generated/'` — ZERO remaining
