## Why

The depositar page shows banking instructions (mock data) but no way to actually trigger a deposit. For demo purposes, the user needs a "Simular depósito" button that calls the existing backend endpoint and credits the wallet immediately.

## What Changes

- Add a "Simular depósito" card to `/depositar` page with amount input + currency selector
- On submit, calls `POST /wallet/deposit` and invalidates wallet/transaction queries
- Show success feedback and update the recent deposits list

## Capabilities

### New Capabilities
- `simular-deposito`: In-app deposit simulation UI for demo purposes

### Modified Capabilities
*(none)*

## Impact

- **Frontend only**: `app/(dashboard)/depositar/page.tsx` — add simulation card
- No backend changes needed (endpoint already exists)
