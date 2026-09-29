# Tasks: Wallet Precision Refactor

## Phase 0: Schema Migration

- [ ] 0.1 Modify `prisma/schema.prisma` — `Wallet.balance` → `Decimal(20,8)`, `Transaction.amount` → `Decimal(20,8)`
- [ ] 0.2 `npx prisma migrate dev --name widen-decimal-precision`

## Phase 1: Interfaces + DTOs

- [ ] 1.1 Fix `interfaces/wallet.interface.ts` — `amount: number` → `amount: string` in all 4 interfaces
- [ ] 1.2 Fix `dto/deposit.dto.ts` — `@IsNumber` → `@IsString` + `@Matches(/^\d+(\.\d+)?$/)`
- [ ] 1.3 Fix `dto/withdraw.dto.ts` — same
- [ ] 1.4 Fix `dto/exchange.dto.ts` — same
- [ ] 1.5 Fix `dto/send.dto.ts` — same

## Phase 2: Helpers

- [ ] 2.1 Add `withOptimisticRetry<T>()` private method to WalletService
- [ ] 2.2 Add `getDecimalPlaces(currency)` — precision table (ARS=2, USD=2, USDT=6)
- [ ] 2.3 Add `EXCHANGE_RATE_MAX_AGE_MS` via `process.env`, default 5 min

## Phase 3: deposit() Refactor

- [ ] 3.1 Refactor `deposit()` — remove loop, use `withOptimisticRetry`, `new Decimal(amount)`, no `Number()`
- [ ] 3.2 Add `!transaction` guard after retry loop
- [ ] 3.3 Webhook dispatch with Decimal-safe values

## Phase 4: withdraw() Refactor

- [ ] 4.1 Refactor `withdraw()` — same pattern
- [ ] 4.2 Replace `Number(wallet.balance) < amount` with `wallet.balance.lessThan(decAmount)`

## Phase 5: exchange() Refactor

- [ ] 5.1 Refactor `exchange()` — same pattern, plus staleness check
- [ ] 5.2 Replace `parseFloat((amount * rate).toFixed(2))` with `sourceAmount.mul(rate).toDecimalPlaces(getDecimalPlaces(toCurrency))`
- [ ] 5.3 Add `!transaction` guard

## Phase 6: send() Refactor

- [ ] 6.1 Refactor `send()` — same pattern
- [ ] 6.2 Fix webhook type: `"withdraw.completed"` → `"transfer.completed"`

## Phase 7: ExchangeRateService

- [ ] 7.1 Fix `exchange-rate.service.ts` — `getCurrent()`, `getRate()`, `getHistory()` return raw Decimal, not `Number()`

## Phase 8: Verification

- [ ] 8.1 `npm run test` — wallet + exchange-rate tests pass
- [ ] 8.2 `grep -R "Number(" src/modules/wallet src/modules/exchange-rate` — zero matches
- [ ] 8.3 `grep -R "parseFloat\|toFixed" src/modules/wallet` — zero matches
- [ ] 8.4 Verify `withOptimisticRetry` is the only retry loop
