## Context

Dashboard currently shows only USD balance, yield info, and quick action links. The `getWallets()` query returns all user wallets (USD, ARS, USDT, BRL) but only USD is displayed. The `getTransactions()` query returns all transactions but only yield is extracted.

## Goals / Non-Goals

**Goals:**
- Show each wallet as a card with currency, balance, and flag icon
- Show last 5 transactions (any type) in a compact list
- Keep existing layout structure (hero row + yields)

**Non-Goals:**
- Charts or graphs for multi-wallet
- Currency conversion totals (sum across currencies)

## Decisions

### Decision 1: Wallet cards grid below hero row
**Chosen**: Grid of small cards below the main balance card
- **Rationale**: Clear visual hierarchy — main balance (USD) at top, sub-wallets below

### Decision 2: Recent transactions as compact list
**Chosen**: Simple list with icon, description, amount, date, status badge
- **Rationale**: Matches the existing transaction page pattern, consistent UX

## Risks / Trade-offs

- [Risk] Too many wallets make the dashboard busy → Mitigation: Show max 4 currencies, hide empty ones
