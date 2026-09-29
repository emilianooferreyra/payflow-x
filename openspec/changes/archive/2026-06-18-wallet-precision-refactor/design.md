# Design: Wallet Precision Refactor

## Decimal Policy

- Monetary values are never represented as JavaScript `number`.
- DTO boundary receives `string` — validated for format, not precision.
- Services convert once to `Decimal` from `decimal.js`.
- Database stores `Decimal` at sufficient width for all supported currencies (`20, 8`).
- API responses serialize `Decimal` as `string` (Prisma default for JSON).

## Technical Approach

Every monetary value enters as `string`. The only conversion to a numeric type happens once — `new Decimal(amount)` — and from that point all arithmetic, comparison, and storage uses `Decimal`. No `Number()`, no `parseFloat()`, no `toFixed()`, no implicit casts.

The four retry loops are extracted into a single `withOptimisticRetry<T>()` helper.

Schema: `Wallet.balance` and `Transaction.amount` change from `Decimal(18,2)` to `Decimal(20,8)` to support USDT (6 decimal places) and future currencies (BTC=8).

## Architecture Decisions

### Decision: String at the API Boundary

- **Choice**: `amount: string` in DTOs and interfaces
- **Alternatives**: `number` (floats lose precision), `bigint` in cents (frontend multiplies per currency)
- **Rationale**: String is standard in financial APIs (Stripe, Plaid). DTO validates format with `@Matches(/^\d+(\.\d+)?$/)` — business-level precision validation happens in the service via `getDecimalPlaces(currency)`. A JSON `number` fails `@IsString()` and returns 400.

### Decision: Decimal Everywhere in the Service

- **Choice**: `Decimal` from `decimal.js` throughout
- **Rationale**: `new Decimal(amount)` is the single entry point. `.lessThan()`, `.mul()`, `.toDecimalPlaces()` are exact. Prisma accepts Decimal for `increment`/`decrement`.

### Decision: Schema Width `Decimal(20,8)`

- **Choice**: `balance Decimal @db.Decimal(20, 8)`, `amount Decimal @db.Decimal(20, 8)`
- **Rationale**: 20 total digits, 8 fractional. Supports USDT (6) and BTC (8) without changes. The previous `18,2` would truncate USDT amounts to 2 decimal places silently.

### Decision: Currency Precision Table

| Currency | Decimals |
|----------|----------|
| ARS | 2 |
| USD | 2 |
| USDT | 6 |

`getDecimalPlaces(currency)` drives exchange rate rounding and precision validation in the service:

```typescript
function validateCurrencyPrecision(currency: CurrencyEnum, amount: string): void {
  const decimals = getDecimalPlaces(currency)
  const decimalPart = amount.includes(".") ? amount.split(".")[1] : ""
  if (decimalPart.length > decimals) {
    throw new BadRequestException(
      `${currency} supports at most ${decimals} decimal places`,
    )
  }
}
```

Format validation lives in the DTO (`@Matches`). Business precision validation lives in the service — separation of concerns.

### Decision: Exchange Rate Staleness via Env Var

- **Choice**: `EXCHANGE_RATE_MAX_AGE_MS` env var, default `300_000` (5 min)
- **Rationale**: No hardcoded magic number. Adjustable per deployment.

## Data Flow

```
DTO (string amount)
  → class-validator: @IsString() + @Matches(/^\d+(\.\d+)?$/)
  → service: new Decimal(amount) ← única conversión
  → wallet.balance.lessThan(decAmount)
  → tx.wallet.updateMany({ data: { balance: { increment: decAmount } } })
  → tx.transaction.create({ data: { amount: decAmount } })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | `balance` + `amount` → `Decimal(20,8)` |
| `interfaces/wallet.interface.ts` | Modify | `amount: number` → `string` |
| `dto/*.ts` (4 files) | Modify | `@IsNumber` → `@IsString` + `@Matches` |
| `wallet.service.ts` | Modify | Decimal + retry helper + staleness + webhook fix |
| `exchange-rate.service.ts` | Modify | Return Decimal, not Number |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Decimal arithmetic exact | `new Decimal("0.1").add("0.2")` equals `0.3` |
| Unit | Rate staleness enforced | Mock `rate.date` beyond threshold |
| Unit | Retry exhaustion | Mock `updateMany.count = 0` × 3 |
| Integration | Deposit with string amount works | e2e |
| Integration | Deposit with number amount rejected (400) | e2e |
| Migration | Up/down produces no data loss | `prisma migrate dev` |

## Migration / Rollback

Prisma migration: widen `Decimal(18,2)` → `Decimal(20,8)`.

**Up**: Safe — all existing data fits in the wider column.
**Down**: Only safe if no data exceeding 2 decimal places was written after the up migration. USDT amounts like `1.123456` would be truncated. Mitigation: DB snapshot before migration in production.

Rollback validation:
- [ ] Existing balances preserved after up migration
- [ ] Existing transactions preserved after up migration
- [ ] Down migration only applied if no high-precision data was written

## Future Work

- **Ledger Entries** — double-entry ledger between Wallet and Transaction for audit trail and reconciliation.
- **Idempotency Keys** — service-level idempotency inside the DB transaction, not just at the controller interceptor.
- **Outbox Pattern** — webhook dispatch via `OutboxEvent` table with background worker for guaranteed delivery.
- **Audit Log** — before/after snapshots for every balance-changing operation.

## Open Questions

None.
