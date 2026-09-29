# TypeScript Advanced Types — Design

## Overview

6 cambios independientes que eliminan `any`, casts, y duplicación manual, moviendo el codebase de tipo C- a A en usage de TypeScript.

---

## 1. assertFound<T>()

**File:** `src/common/utils/assert-found.ts` (nuevo)

```ts
import { NotFoundException } from "@nestjs/common"

export function assertFound<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value == null) {
    throw new NotFoundException(`${name} not found`)
  }
}
```

**Usage pattern:**
```ts
// Before (15+ occurrences):
const wallet = await tx.wallet.findUnique(...)
if (!wallet) throw new NotFoundException(`Wallet ${currency} not found`)

// After:
const wallet = await tx.wallet.findUnique(...)
assertFound(wallet, `Wallet ${currency}`)
```

The `asserts value is T` return type tells TypeScript: "from this point on, `wallet` is `T`, not `T | null`". No more `if` guards.

**Scope:** Replace all manual null-check + NotFoundException patterns across all services (wallet, user, session, card, investment, beneficiary, kyc, exchange-rate, transaction).

---

## 2. isCurrencyEnum type guard + satisfies

### isCurrencyEnum

**File:** `src/modules/wallet/utils/get-decimal-places.ts`

```ts
export function isCurrencyEnum(value: string): value is CurrencyEnum {
  return Object.values(CurrencyEnum).includes(value as CurrencyEnum)
}
```

Then in `validate-currency-precision.ts`, replace `currency as any`:

```ts
export function validateCurrencyPrecision(currency: string, amount: Prisma.Decimal): void {
  if (!isCurrencyEnum(currency)) {
    throw new BadRequestException(`Unsupported currency: ${currency}`)
  }
  const maxDecimals = getDecimalPlaces(currency)
  // ...
}
```

### satisfies

```ts
const CURRENCY_DECIMALS = {
  [CurrencyEnum.ARS]: 2,
  [CurrencyEnum.USD]: 2,
  [CurrencyEnum.USDT]: 6,
  [CurrencyEnum.BRL]: 2,
} satisfies Record<CurrencyEnum, number>
```

This validates all keys exist without widening to `Record<string, number>`.

---

## 3. CurrentUser<T> generic

**File:** `src/modules/auth/decorators/current-user.decorator.ts`

```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common"

export interface AuthenticatedUser {
  userId: string
  email?: string
  name?: string
  lastName?: string
  avatar?: string
}

export const CurrentUser = createParamDecorator(
  <T = AuthenticatedUser>(data: keyof T | undefined, ctx: ExecutionContext): T[keyof T] | T => {
    const request = ctx.switchToHttp().getRequest()
    if (data) return request.user?.[data]
    return request.user ?? ({} as T)
  },
)
```

**Usage:**
```ts
// Before:
async getWallets(@CurrentUser() user: any) {
  return this.walletService.getWallets(user.userId)
}

// After — TypeScript infers userId is string, user is AuthenticatedUser:
async getWallets(@CurrentUser('userId') userId: string) {
  return this.walletService.getWallets(userId)
}

async deposit(@CurrentUser() user: AuthenticatedUser, @Body() dto: DepositDto) {
  return this.walletService.deposit({ userId: user.userId, ...dto })
}
```

---

## 4. satisfies envType

**File:** `src/config/envs.ts`

Replace manual reconstruction with `satisfies`:

```ts
export const envs = envParsed.data satisfies envType
```

Delete lines 34-46. `envs` keeps the exact same type but is now derived directly from the parsed data.

---

## 5. WebhookEvent discriminated union

**File:** `src/modules/webhook/webhook.service.ts`

```ts
interface DepositEventData {
  walletId: string
  userId: string
  amount: string
  currency: string
  transactionId: string
}

type WebhookEvent =
  | { type: "deposit.confirmed"; data: DepositEventData }
  | { type: "withdraw.completed"; data: DepositEventData }
  | { type: "transfer.completed"; data: DepositEventData }
```

The three callers already pass the correct shape — this change just makes TypeScript enforce it.

**In `dispatch`**, switching on `event.type` narrows `event.data` automatically.

---

## 6. Derive Update interfaces

**File:** `src/modules/users/interfaces/users.interface.ts`

```ts
// Before:
interface UpdateUserInterface {
  name?: string
  lastName?: string
  email?: string
  password?: string
  country?: string
  language?: string
  phone?: string
  avatar?: string
  backupEmail?: string
}

// After:
type UpdateUserInterface = Partial<Omit<CreateUserInterface, 'password'>>
```

Same pattern for beneficiaries and any other duplicated pairs.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/common/utils/assert-found.ts` | NEW — `assertFound<T>()` |
| `src/modules/wallet/utils/get-decimal-places.ts` | Add `isCurrencyEnum` + `satisfies` |
| `src/modules/wallet/utils/validate-currency-precision.ts` | Replace `as any` with type guard |
| `src/modules/auth/decorators/current-user.decorator.ts` | Generic `<T>` + `AuthenticatedUser` interface |
| All controller files (10+) | Remove `: any` annotations, use string keys |
| `src/config/envs.ts` | Replace manual reconstruction with `satisfies` |
| `src/modules/webhook/webhook.service.ts` | Discriminated union + typed event data |
| `src/modules/users/interfaces/users.interface.ts` | Derive Update from Create with `Omit` + `Partial` |
| `src/modules/beneficiaries/interfaces/beneficiaries.interface.ts` | Same pattern |
| All service files (15+) | Replace `if (!x) throw` with `assertFound(x, 'name')` |

## Rollback

Code-only. 6 independent changes, revertible commit by commit.
