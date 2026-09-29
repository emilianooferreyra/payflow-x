## Context

CardService has 3 methods (getCards, freeze, unfreeze) using PrismaService. It follows the same pattern as other service tests: mock PrismaService with `mockPrisma`, use `Test.createTestingModule`, test success and error paths.

## Goals / Non-Goals

**Goals:**
- Cover getCards: returns user's cards ordered by createdAt desc
- Cover freeze: marks card as frozen, throws on not-found, throws on already frozen
- Cover unfreeze: marks card as unfrozen, throws on not-found, throws on not frozen

**Non-Goals:**
- No e2e tests (unit coverage is sufficient for this CRUD service)
- No controller tests (no custom logic beyond service delegation)

## Decisions

**Same pattern as existing service tests**: Use `mockPrisma` from `src/common/testing/mock-prisma.ts` and `Test.createTestingModule` — identical to wallet, transaction, investment, and other service tests. No new patterns needed.

**No `makeCard` factory**: The card has a simple shape. Inline the mock object — creating a factory for one test file is over-engineering.

## Risks / Trade-offs

- **Low risk**: Pure CRUD service with no external dependencies (no Redis, no webhooks, no cache). Mocking Prisma covers all execution paths.
