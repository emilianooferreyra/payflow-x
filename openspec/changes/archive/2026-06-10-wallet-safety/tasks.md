# Tasks: Wallet Safety

## Phase 1: Foundation

- [x] 1.1 Add `version Int @default(1)` to Wallet model in `prisma/schema.prisma`
- [x] 1.2 Add `IdempotencyRecord` model to `prisma/schema.prisma`
- [x] 1.3 Run `npx prisma migrate dev --name add-wallet-safety`

## Phase 2: Idempotency Guard

- [x] 2.1 Create `src/common/guards/idempotency.guard.ts` — checks header, stores/returns cached response
- [x] 2.2 Create `src/common/decorators/idempotent.decorator.ts` — `@Idempotent()` route decorator
- [x] 2.3 Apply `@Idempotent()` to deposit, withdraw, exchange in `wallet.controller.ts`

## Phase 3: Optimistic Locking

- [x] 3.1 Update `wallet.service.ts` — balance operations use `version` condition + retry loop
- [x] 3.2 Update interfaces to remove `version` from input (internal only)
