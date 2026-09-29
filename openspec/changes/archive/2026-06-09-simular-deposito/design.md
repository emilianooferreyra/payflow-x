## Context

The depositar page currently displays mock banking instructions (account number, CBU, alias) and a list of past deposits. There's no way to trigger a deposit within the app — the user must copy the banking details and make an external transfer.

For demo purposes, we need a quick "Simular depósito" feature that calls `POST /wallet/deposit` directly.

## Goals / Non-Goals

**Goals:**
- Add a simulation card to the depositar page
- Currency selector (USD default)
- Amount input
- Submit calls existing deposit API
- Show success toast and refresh data

**Non-Goals:**
- Edit or remove the existing banking instructions (keep for real flow)
- Backend changes

## Decisions

### Decision 1: Keep banking instructions + add simulation card
**Chosen**: Add a second card alongside the existing banking instructions, perhaps in a Tabs layout
- **Rationale**: The banking instructions are mock data but represent the real flow. The simulation is for demo. Both should coexist.
- **Trade-off**: Two deposit methods might confuse, but a clear "Simulación" label differentiates them.

## Risks / Trade-offs

- [Risk] User might think simulation is a real deposit → Mitigation: Clear "Simulación" label on the card
