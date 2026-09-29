# Design: Webhook System

## Technical Approach

New `WebhookModule` following the existing module pattern (wallet, card, kyc). `WebhookService.dispatch()` is called from wallet service after deposit/withdraw commits. Uses built-in `crypto` for HMAC-SHA256 and in-process `setTimeout` for retry with exponential backoff.

## Architecture Decisions

### Decision: In-process retry vs queue

**Choice**: `setTimeout` with backoff
**Alternatives considered**: Bull queue, scheduled job
**Rationale**: No external dependency, simple enough for v1. Queue can replace later without changing the dispatch interface.

### Decision: Per-endpoint secret vs global secret

**Choice**: Random UUID generated per endpoint on creation
**Rationale**: Each partner has a unique key. If one leaks, others aren't affected.

### Decision: Sync dispatch vs fire-and-forget

**Choice**: Fire-and-forget (not awaited)
**Rationale**: Don't block the deposit/withdraw response. The webhook attempt runs independently.

## Data Flow

    WalletService.deposit()
         │
         ▼
    WebhookService.dispatch(event, payload)
         │
         ▼
    Load endpoints from DB
         │
         ▼
    For each endpoint:
      Sign payload with HMAC-SHA256
      POST to endpoint URL
         │
         ├── 2xx → mark delivered
         └── fail → schedule retry (1m, 5m, 15m)

## Prisma Models

```prisma
model WebhookEndpoint {
  id        String   @id @default(uuid())
  url       String
  secret    String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  deliveries WebhookDelivery[]
}

model WebhookDelivery {
  id         String   @id @default(uuid())
  endpointId String
  endpoint   WebhookEndpoint @relation(fields: [endpointId], references: [id], onDelete: Cascade)
  event      String
  payload    String   // JSON
  status     String   // pending, delivered, failed
  attempts   Int      @default(0)
  responseStatus  Int?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([endpointId, createdAt])
}
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add WebhookEndpoint + WebhookDelivery models |
| `src/modules/webhook/webhook.module.ts` | Create | Module definition |
| `src/modules/webhook/webhook.service.ts` | Create | Dispatch, sign, retry logic |
| `src/modules/webhook/webhook.controller.ts` | Create | CRUD endpoints + list deliveries |
| `src/modules/webhook/dto/` | Create | DTOs for request/response |
| `src/modules/wallet/wallet.service.ts` | Modify | Call dispatch() after deposit/withdraw |

## Interfaces

```typescript
interface WebhookPayload {
  event: string
  data: Record<string, unknown>
  timestamp: string
}

interface WebhookEvent {
  type: "deposit.confirmed" | "withdraw.completed"
  data: {
    walletId: string
    userId: string
    amount: number
    currency: string
    transactionId: string
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | WebhookService (sign, dispatch, retry) | Mock fetch/axios, assert calls |
| Integration | WebhookController (CRUD) | Use supertest + test DB |
| E2E | Deposit triggers webhook | Spy on dispatch calls |

## Migration

`npx prisma migrate dev --name add_webhook_tables`

## Open Questions

None.
