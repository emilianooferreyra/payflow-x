# Proposal: Wallet Precision Refactor

## Intent

The wallet service operates monetary amounts using JavaScript `number` — a floating-point type that loses precision. `0.1 + 0.2 !== 0.3` is a real bug in a fintech. The `amount` field enters as `number` from DTOs, is compared with `Number(wallet.balance)` (casting Prisma Decimal to float), and is used in exchange rate multiplication with `parseFloat((amount * rate).toFixed(2))`. For USDT (6 decimal places) this is unacceptable.

Additionally: retry loop duplicated across 4 methods with inconsistencies (deposit/exchange lack `!transaction` guard), exchange never checks rate staleness, send webhook uses wrong event type.

## Scope

### In Scope
- Schema migration: `balance` and `amount` from `Decimal(18,2)` → `Decimal(20,8)` to support up to 8 decimal places
- `amount: number` → `string` in interfaces and DTOs
- `Decimal` throughout wallet service — no `Number()`, `parseFloat()`, or `toFixed()`
- `withOptimisticRetry` helper replacing 4 duplicated loops
- `!transaction` guard for deposit and exchange
- Exchange rate staleness check via `EXCHANGE_RATE_MAX_AGE_MS` env var
- Fix send webhook type to `"transfer.completed"`
- Currency-aware precision via `getDecimalPlaces(currency)`

### Out of Scope (Future Work)
- Webhook outbox pattern
- Frontend DTO updates
- Other services (investments, cards)
- Ledger entries (double-entry audit trail)

## Approach

Schema migration → interfaces/DTOs → helpers → refactor each method (deposit, withdraw, exchange, send) → ExchangeRateService → grep for `Number()`/`parseFloat()`/`toFixed()`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Wallet.balance + Transaction.amount → `Decimal(20,8)` |
| `wallet.interface.ts` | Modified | `amount: number` → `string` |
| `deposit.dto.ts` | Modified | `@IsNumber` → `@IsString` + `@Matches` |
| `withdraw.dto.ts` | Modified | Same |
| `exchange.dto.ts` | Modified | Same |
| `send.dto.ts` | Modified | Same |
| `wallet.service.ts` | Modified | Full rewrite to use Decimal |
| `exchange-rate.service.ts` | Modified | Return Decimal, not Number |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Frontend sends `number` instead of `string` | Medium | `@IsString()` — a JSON number fails validation, returns 400 |
| Decimal import from Prisma changes | Low | Use stable `decimal.js` directly |
| Existing idempotency records cached with number | Low | Fresh requests produce new cache entries |

## Rollback Plan

Migration is reversible only if no data exceeding the old precision (`18,2`) has been written. If a USDT transaction with 6 decimal places lands in the wider column, reverting to `Decimal(18,2)` truncates that data. Mitigation: take a DB snapshot before applying the migration in production. Code rollback is safe at any point.

## Success Criteria

- [ ] No monetary values represented as TypeScript `number` in wallet domain
- [ ] All 4 methods use `Decimal` — zero `Number()`, `parseFloat()`, or `toFixed()` calls
- [ ] Exchange rate staleness check via env var
- [ ] `withOptimisticRetry` is the only retry loop
- [ ] `!transaction` guard present in all 4 methods
- [ ] Send webhook type is `"transfer.completed"`
- [ ] Schema migration: `balance` + `amount` → `Decimal(20,8)`
- [ ] Existing tests pass
