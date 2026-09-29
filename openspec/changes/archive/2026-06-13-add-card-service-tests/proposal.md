## Why

CardService (getCards, freeze, unfreeze) currently has 0% test coverage. As a financial operation (freezing cards prevents fraud), it needs unit tests to verify correct behavior, error handling, and edge cases.

## What Changes

- Create `card.service.spec.ts` with tests for `getCards`, `freeze`, and `unfreeze`
- Mock PrismaService for all database operations
- Cover success paths, not-found errors, and idempotency checks (already frozen / not frozen)

## Capabilities

### New Capabilities
- `card-service`: Unit tests for CardService covering balance queries, freeze/unfreeze lifecycle

### Modified Capabilities

None — new capability only, no existing specs change.

## Impact

- **New file**: `src/modules/card/card.service.spec.ts`
- **Dependencies**: PrismaService mock (already available via `mockPrisma` from testing helpers)
