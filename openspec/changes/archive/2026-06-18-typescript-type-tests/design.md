# Design: TypeScript Advanced Types — Phase 2

## Overview

7 independent improvements applying the remaining TypeScript Advanced Types patterns. Each phase is self-contained and independently verifiable.

---

## 1. Type Tests

**File:** `src/__type-tests__/index.ts` (NEW)

Utility:
```typescript
type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
```

Tests use `const _t: AssertEqual<Got, Expected> = true` — fails to compile if types diverge.
For narrowing tests, use assignments: `const _narrowed: string = (() => { ... })()`.
For error expectations, use `// @ts-expect-error`.

---

## 2. Template Literal Types

### 2a. KYC shared types

**File:** `src/modules/kyc/kyc.types.ts` (NEW)
```typescript
export type DocumentType = "DNI" | "PASSPORT" | "DRIVER_LICENSE";
export type KycReviewAction = "approve" | "reject";
```

**DTOs:** Import and use the literal types (already annotated in DTOs, just extract to shared).

### 2b. AuthorizationTokenEnum string enum

**File:** `src/common/enums/authorization-token.enum.ts`
```typescript
export enum AuthorizationTokenEnum {
  CONFIRM_EMAIL = "confirm_email",
  CONFIRM_BACKUP_EMAIL = "confirm_backup_email",
  CONFIRM_PHONE = "confirm_phone",
  CONFIRM_BACKUP_PHONE = "confirm_backup_phone",
  RECOVERY_PASSWORD = "recovery_password",
  TWO_FACTOR = "two_factor",
}
```
Cache keys change from `token0:user:x` → `tokenconfirm_email:user:x`. No functional change.

### 2c. two-factor-pending literal

**File:** `src/modules/auth/strategies/two-factor-pending.strategy.ts`
```typescript
async validate(payload: { sub: string; type: "2fa_pending" }) {
```
The runtime `if` check becomes a type-narrowing comparison.

---

## 3. Typed API Client

**File:** `src/modules/exchange-rate/exchange-rate.service.ts`
```typescript
interface ExchangeRateApiResponse {
  result: string;
  time_last_update_unix: number;
  base_code: string;
  conversion_rates: {
    ARS: number;
    BRL: number;
    USD: number;
    [key: string]: number;
  };
}
```
Replace `const data = await res.json()` with `const data: ExchangeRateApiResponse = await res.json()`.

---

## 4. Google OAuth types

**File:** `src/modules/auth/strategies/google.strategy.ts`
```typescript
export interface GoogleProfile {
  id: string;
  name: { givenName: string; familyName: string };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
}

interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  lastName: string;
  avatar?: string;
}
```

Return with `satisfies GoogleUser` for exhaustiveness.

**File:** `src/modules/auth/auth.service.ts`
```typescript
async googleLogin(googleUser: GoogleUser, res: Response, ...) {
```

---

## 5. Express types

### 6a. Auth service `res: Response`

Add `import type { Response } from "express"` to:
- `auth.service.ts` (4 occurrences: register, refresh, googleLogin, logout)
- `session-token.service.ts` (2 occurrences: setTokenCookies, clearTokenCookies)
- `two-factor.service.ts` (1 occurrence: verifyTwoFactor)

### 6b. Refresh strategy `req: Request`

**File:** `src/modules/auth/strategies/refresh.strategy.ts`
```typescript
import type { Request } from "express";
async validate(req: Request, payload: ...) {
```

---

## Files Summary

| File | Change |
|------|--------|
| `src/__type-tests__/index.ts` | NEW — all type assertions |
| `src/modules/kyc/kyc.types.ts` | NEW — shared literal types |
| `src/modules/kyc/dto/submit-kyc.dto.ts` | Import shared DocumentType |
| `src/modules/kyc/dto/review-kyc.dto.ts` | Import shared KycReviewAction |
| `src/common/enums/authorization-token.enum.ts` | String enum values |
| `src/modules/auth/strategies/two-factor-pending.strategy.ts` | Literal type |
| `src/modules/exchange-rate/exchange-rate.service.ts` | Typed API response |
| `src/modules/auth/strategies/google.strategy.ts` | GoogleProfile + GoogleUser |
| `src/modules/auth/auth.service.ts` | GoogleUser + `res: Response` |
| `src/modules/auth/session-token.service.ts` | `res: Response` |
| `src/modules/auth/two-factor.service.ts` | `res: Response` |
| `src/modules/auth/strategies/refresh.strategy.ts` | `req: Request` |

## Rollback

Code only — 6 independent phases, revertible commit by commit.
