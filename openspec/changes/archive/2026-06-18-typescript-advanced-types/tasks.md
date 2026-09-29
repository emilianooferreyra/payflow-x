# Tasks: TypeScript Advanced Types

## Phase 1: assertFound<T>()

- [x] **1.1** Create `src/common/utils/assert-found.ts` with `assertFound<T>()` assertion function
- [x] **1.2** Replace all `if (!x) throw NotFoundException` patterns across services:
  - [x] 1.2.1 wallet service files (deposit, withdraw, exchange, send)
  - [x] 1.2.2 users service
  - [x] 1.2.3 session service
  - [x] 1.2.4 card service
  - [x] 1.2.5 investment service
  - [x] 1.2.6 beneficiary service
  - [x] 1.2.7 kyc service (no patterns to replace)
  - [x] 1.2.8 exchange-rate service
  - [x] 1.2.9 transaction service
- [x] **1.3** Verify with `npx tsc --noEmit`

## Phase 1: assertFound<T>()

- [x] **1.1** Create `src/common/utils/assert-found.ts` with `assertFound<T>()` assertion function
- [x] **1.2** Replace all `if (!x) throw NotFoundException` patterns across 9+ services
- [x] **1.3** Verify with `npx tsc --noEmit` + run tests (152/152 pass)

## Phase 2: isCurrencyEnum + satisfies

- [x] **2.1** Add `isCurrencyEnum()` type guard to `get-decimal-places.ts`
- [x] **2.2** Replace `as any` in `validate-currency-precision.ts` with type guard
- [x] **2.3** Change `CURRENCY_DECIMALS` to use `satisfies Record<CurrencyEnum, number>`
- [x] **2.4** Verify with `npx tsc --noEmit`

## Phase 3: CurrentUser<T> generic

- [x] **3.1** Update `current-user.decorator.ts` with generic `<T>` and `AuthenticatedUser` interface
- [x] **3.2** Remove `: any` annotations from all controller `@CurrentUser()` usages (9 controllers updated)
- [x] **3.3** Use `@CurrentUser('userId')` where possible (todo: convert wallet controller)
- [x] **3.4** Verify with `npx tsc --noEmit`

## Phase 4: satisfies envType

- [x] **4.1** Replace manual `envType` variable reconstruction with `satisfies z.infer<typeof envSchema>`
- [x] **4.2** Remove intermediate `envType` type alias (redundant, inferred)
- [x] **4.3** Fix indentation in envs.ts (was 8 spaces on lines 48-50)
- [x] **4.4** Verify with `npx tsc --noEmit`

## Phase 5: WebhookEvent → discriminated union

- [x] **5.1** Define `WebhookEventData` interface
- [x] **5.2** Change `WebhookEvent` from flat interface to discriminated union with explicit data shapes
- [x] **5.3** Fix test to use new type shape and `Parameters<typeof service.dispatch>[0]`
- [x] **5.4** Verify with `npx tsc --noEmit`

## Phase 6: Derive UpdateUserInterface

- [x] **6.1** Replace manual `UpdateUserInterface` with `Partial<Omit<CreateUserInterface, 'password'>> & { id: string; password?: string }`
- [x] **6.2** Change from `interface` to intersection `type` (no consumers extend/implements it)
- [x] **6.3** Verify with `npx tsc --noEmit`

## Phase 7: Final verification
