## 1. Frontend — Simulate deposit UI

- [x] 1.1 Add "Simular depósito" card to `app/(dashboard)/depositar/page.tsx` with:
  - Currency selector (USD preselected)
  - Amount input with validation (> 0)
  - Submit button that calls `deposit()` from `lib/api/wallet.ts`
  - Shows success toast on completion
  - Invalidates `["wallets"]` and `["transactions"]` query keys
- [x] 1.2 Add visual separation between banking instructions and simulation card (different section or tab)
