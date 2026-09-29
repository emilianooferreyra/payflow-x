# Proposal: Wallet Safety

## Intent

The wallet operations (deposit, withdraw, exchange) have two critical fintech safety gaps: no idempotency (network retries cause double-spend) and no optimistic locking (concurrent requests can overdraw). This change closes both.

## Scope

### In Scope
- Idempotency key on `POST /wallet/deposit`, `/withdraw`, `/exchange`
- Optimistic locking (`version` field) on Wallet model with retry
- Idempotency middleware/reusable guard to replay on duplicate keys
- Transactional cleanup of expired idempotency keys

### Out of Scope
- 2FA/TOTP implementation (separate change)
- Idempotency on webhook delivery
- Rate limiting (already handled by ThrottlerModule)

## Approach

**Idempotency**: New `IdempotencyRecord` model in Prisma. Decorator-based guard that checks `Idempotency-Key` header, stores request hash + response, replays on duplicate. Keys expire after 24h.

**Optimistic locking**: Add `version Int @default(1)` to Wallet. On withdraw/exchange, do `UPDATE ... SET balance = balance - X, version = version + 1 WHERE id = Y AND version = V`. If affected rows = 0, retry the whole Prisma transaction (read fresh balance + version, retry up to 3 times).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | +`IdempotencyRecord` model, +`version` on Wallet |
| `src/modules/wallet/wallet.service.ts` | Modified | Optimistic lock + retry in withdraw/exchange |
| `src/modules/wallet/wallet.controller.ts` | Modified | Accept `Idempotency-Key` header |
| `src/common/guards/idempotency.guard.ts` | New | Reusable idempotency guard |
| `src/common/decorators/idempotency.decorator.ts` | New | `@Idempotent()` decorator |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Retry loop livelock under high contention | Low | Cap at 3 retries, exponential backoff |
| Idempotency key collision | Low | Key = header + user + route; store SHA-256 hash |

## Rollback Plan

Revert Prisma migration, remove guard from controller, restore wallet.service.ts.

## Dependencies

None.

## Success Criteria

- [ ] Duplicate `Idempotency-Key` on deposit returns same response, no new transaction
- [ ] Two concurrent withdraws from same wallet: second fails with insufficient balance
- [ ] `version` increments on each wallet mutation
