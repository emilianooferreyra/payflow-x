# Proposal: Webhook System

## Intent

Notify external partners when domain events occur (deposits, withdrawals). Takenos/Belo pattern: partner registers a callback URL, backend signs the payload with HMAC-SHA256 and retries on failure.

## Scope

### In Scope
- `webhook_endpoints` + `webhook_deliveries` tables
- `WebhookModule` with service, controller, types
- HMAC-SHA256 signing per endpoint
- `WebhookService.dispatch()` called from wallet/transaction services
- Retry with exponential backoff (worker or in-process)
- Admin CRUD for endpoints (register, list, delete)

### Out of Scope
- Dashboard UI for webhook logs
- Idempotency keys
- Event filtering per endpoint (sends all for now)
- Async queue (Bull) — postponed

## Approach

Simple modular approach:

1. Prisma schema with two new models
2. `WebhookModule` with `WebhookService` (dispatch, retry, sign) + `WebhookController` (CRUD)
3. Hook `dispatch()` into `WalletService.deposit()` and `.withdraw()` after DB commit
4. Retry via `setTimeout` with backoff (1min, 5min, 15min) — no queue needed yet

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add `WebhookEndpoint` + `WebhookDelivery` models |
| `src/modules/webhook/` | New | Module, service, controller, DTOs, types |
| `src/modules/wallet/wallet.service.ts` | Modified | Call `dispatch()` after deposit/withdraw |
| `src/modules/transaction/` | TBD | Maybe dispatch on transaction events |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Retry in-process blocks the request | Low | Fire-and-forget with setTimeout, don't await |
| DB writes in retry loop | Low | Use Prisma `$transaction` for atomicity |
| Secret leak via env | Low | Store per-endpoint secret, not global |

## Rollback Plan

Drop `webhook_endpoints` and `webhook_deliveries` tables. Remove `WebhookModule` import. Revert wallet service calls.

## Dependencies

- Prisma migration (new tables)
- `crypto` (built-in Node) for HMAC

## Success Criteria

- [ ] Partner registers an endpoint via POST and receives test ping
- [ ] Deposit triggers a signed webhook delivery
- [ ] Failed delivery retries at least once
