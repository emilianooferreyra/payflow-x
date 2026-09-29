## ADDED Requirements

### Requirement: Dashboard shows all wallet balances
The dashboard SHALL display each wallet the user owns with its currency and balance.

#### Scenario: View multiple wallets on dashboard
- **WHEN** user views the dashboard
- **AND** has wallets in multiple currencies (USD, ARS, USDT)
- **THEN** each wallet SHALL be displayed as a card with:
  - Currency code and name (e.g. "USD · Dólar")
  - Current balance formatted with currency symbol
- **AND** wallets with zero balance SHALL still be shown

### Requirement: Dashboard shows recent transactions
The dashboard SHALL display the last 5 transactions across all types.

#### Scenario: View recent transactions
- **WHEN** user views the dashboard
- **THEN** a compact list of the 5 most recent transactions SHALL be displayed
- **AND** each transaction SHALL show:
  - Type icon (deposit/withdraw/exchange)
  - Description
  - Amount with sign (+/-)
  - Date
  - Status badge
- **AND** SHALL link to the full transactions page
