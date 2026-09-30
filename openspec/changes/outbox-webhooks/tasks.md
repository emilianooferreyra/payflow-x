Strict TDD: every behavior task starts with a failing test, then the minimum code to pass it, then cleanup. Two pull requests, in order. PR 2 does not start until PR 1 is merged.

## PR 1 — Unit of Work seam (no behavior change)

- [x] 1.1 Baseline: unit 37 suites / 259 tests, e2e 4 suites / 35 tests, typecheck clean
- [x] 1.2 Create `wallet/{domain,application/ports,infrastructure/persistence}`; add an ESLint `no-restricted-imports` override forbidding Prisma imports in `domain/` and `application/`; confirm it fails on a deliberate violation, then remove the violation
- [x] 1.3 Define ports: `UnitOfWork`, `WalletTx`, `WalletRepository` (find by user+currency, create empty, compare-and-swap balance by version), `TransactionRepository` (create). Types use `Money`
- [x] 1.4 RED: integration test for `PrismaUnitOfWork` against Postgres — rollback leaves no partial state; a forced version conflict is retried and applied once; a non-retryable error propagates immediately
- [x] 1.5 GREEN: `PrismaUnitOfWork` and Prisma repositories, delegating to `withOptimisticRetry`; `Decimal` ↔ `Money` mapping lives here
- [x] 1.6 RED→GREEN `DepositService`: rewrite its spec against in-memory fakes of the ports, see it fail, then refactor the service onto `UnitOfWork`
- [x] 1.7 RED→GREEN `SendService` (same procedure)
- [x] 1.8 RED→GREEN `WithdrawService` (same procedure)
- [x] 1.9 Move the three services under `application/`, the controller under `infrastructure/`, wire providers with injection tokens in `WalletModule`; `WebhookService.dispatch` calls are left untouched in this PR
- [x] 1.10 Verify: typecheck, `pnpm test`, `pnpm test:e2e` all green and equal in meaning to the baseline; grep confirms no Prisma import under `wallet/domain` or `wallet/application`
- [ ] 1.11 Open PR 1 with the spec-scenario verification table

Done differently from the first plan (and why):
- `Money.restore` added to the kernel: a strict `Money.of` on a stored balance would have broken wallets holding legacy precision such as 1.0005 USD.
- `PrecisionError` now carries `currency` and `maxDecimals`, so the 400 message stays identical without the application layer touching Prisma.
- A fourth port, `BeneficiaryReader`, because `SendService` read `beneficiary` through Prisma outside the transaction.
- `toMoney` in `application/` maps domain errors to the same 400 responses the API gave before.
- Result: typecheck clean, unit 38 suites / 283 tests, e2e 5 suites / 43 tests (35 baseline + 8 adapter integration), `pnpm build` and `docker build --target prod` succeed. `lint:ci` reports 188 errors in 63 files, none in files this PR touches.

## PR 2 — Outbox and relay

- [ ] 2.1 Migration: table `OutboxEvent` (+ partial index on unprocessed), columns `eventId`, `lockedUntil`, `lastError` on `WebhookDelivery`, unique (`eventId`, `endpointId`); review the generated SQL by hand; additive only
- [ ] 2.2 RED: atomicity tests for `transactional-outbox` — success yields one event; failure after enqueue yields none; retried transaction yields one; failed operation yields none
- [ ] 2.3a RED→GREEN: enqueue takes a per-wallet advisory lock so events for the same wallet become visible in commit order (test with two concurrent transactions)
- [ ] 2.3 GREEN: `OutboxPort` and Prisma adapter exposed as `ctx.outbox`; the three services enqueue their events and stop calling `webhookService.dispatch`
- [ ] 2.4 Create `webhook/{domain,application/ports,infrastructure}`; ports: `OutboxReader`, `EndpointRepository`, `DeliveryRepository`, `WebhookSender`, `Clock`; domain: retry policy as pure functions (backoff with jitter, retryable classification)
- [ ] 2.5 RED→GREEN retry policy unit tests: 1 / 5 / 15 min ±20%, 5xx/408/429/network/timeout retryable, 400/404 permanent, exhausted → dead
- [ ] 2.6 RED→GREEN `RelayOutboxEvents` with fakes: two endpoints, zero endpoints, idempotent re-run
- [ ] 2.7 RED→GREEN `DeliverDueWebhooks` with fakes: delivered, retryable failure persists `nextRetryAt`, permanent failure is dead, attempts exhausted, same row updated, identical bytes on retry
- [ ] 2.8 RED→GREEN `HttpWebhookSender`: `AbortSignal.timeout`, headers `X-Webhook-Signature` and `X-Webhook-Id`, body includes `id`
- [ ] 2.9 RED: integration tests — two concurrent claimers get disjoint batches; expired lease is re-claimed; live lease is skipped
- [ ] 2.10 GREEN: raw-SQL claim with `FOR UPDATE SKIP LOCKED` and lease; the HTTP call happens outside any transaction
- [ ] 2.11 Runner: recursive-timeout loop, `OnModuleInit`/`OnModuleDestroy`, waits for the in-flight batch; env vars `OUTBOX_RELAY_ENABLED`, `OUTBOX_POLL_INTERVAL_MS`, `WEBHOOK_TIMEOUT_MS`, `WEBHOOK_MAX_ATTEMPTS`, `OUTBOX_LEASE_MS` in the Zod schema and `.env.template`; disabled in unit tests
- [ ] 2.12 Delete `WebhookService.dispatch`, the `setTimeout` retry and their dead code; keep endpoint CRUD; update `scripts/webhook-demo.ts` if it depended on synchronous delivery
- [ ] 2.13 e2e: deposit → event in outbox → relay delivers to a local test server; restart between attempts still delivers; slow receiver does not slow the deposit response
- [ ] 2.14 ADR `docs/adr/0001-transactional-outbox.md`: problem, options considered (D1–D7), consequences (at-least-once, ordering not guaranteed), what was deliberately not built
- [ ] 2.15 Verify: typecheck, `pnpm test`, `pnpm test:e2e`; walk every scenario of the four specs and record how it was verified
- [ ] 2.16 Open PR 2 with the verification table; on merge, archive the change so `openspec/specs/webhook/spec.md` is updated
