## 1. CardService Tests

- [x] 1.1 Create `card.service.spec.ts` with mock setup (mockPrisma from testing helpers)
- [x] 1.2 Test `getCards` — returns user's cards ordered by createdAt desc
- [x] 1.3 Test `freeze` success — updates card with isFrozen: true
- [x] 1.4 Test `freeze` errors — throws NotFoundException / UnprocessableEntityException
- [x] 1.5 Test `unfreeze` success — updates card with isFrozen: false
- [x] 1.6 Test `unfreeze` errors — throws NotFoundException / UnprocessableEntityException
