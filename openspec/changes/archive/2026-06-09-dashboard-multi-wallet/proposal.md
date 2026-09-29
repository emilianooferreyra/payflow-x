## Why

The dashboard currently only shows USD balance and APY. Users with multiple currencies (ARS, USDT) can't see their full portfolio at a glance. A multi-wallet dashboard is the first thing a user sees in any fintech app.

## What Changes

- Show all wallet balances (USD, ARS, USDT, BRL) as individual cards on the dashboard
- Show last 5 transactions in a compact list on the dashboard
- Keep existing APY/yield section

## Capabilities

### New Capabilities
- `dashboard-multi-wallet`: Multi-currency wallet display with recent transactions on dashboard

### Modified Capabilities
*(none)*

## Impact

- **Frontend only**: `app/(dashboard)/dashboard/page.tsx` — restructure layout to show multi-wallet + recent transactions
- No backend changes needed (endpoints already return wallets and transactions)
