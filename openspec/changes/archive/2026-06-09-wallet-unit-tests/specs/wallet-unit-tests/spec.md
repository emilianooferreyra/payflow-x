## ADDED Requirements

### Requirement: WalletService deposit
The system SHALL have unit tests for `walletService.deposit`.

#### Scenario: Deposit increases balance and creates transaction
- **WHEN** calling `walletService.deposit({ userId, currency, amount })`
- **THEN** the wallet balance SHALL increase and a DEPOSIT transaction SHALL be created

#### Scenario: Deposit fails on non-existent wallet
- **WHEN** calling `walletService.deposit({ userId, currency, amount })` with unknown currency
- **THEN** the operation SHALL throw NotFoundException

### Requirement: WalletService withdraw
The system SHALL have unit tests for `walletService.withdraw`.

#### Scenario: Withdrawal decreases balance
- **WHEN** calling `walletService.withdraw({ userId, currency, amount })` with sufficient balance
- **THEN** the wallet balance SHALL decrease and a WITHDRAWAL transaction SHALL be created

#### Scenario: Withdrawal fails on insufficient balance
- **WHEN** calling `walletService.withdraw({ userId, currency, amount })` with insufficient balance
- **THEN** the operation SHALL throw UnprocessableEntityException

#### Scenario: Withdrawal fails on non-existent wallet
- **WHEN** calling `walletService.withdraw({ userId, currency, amount })` with unknown currency
- **THEN** the operation SHALL throw NotFoundException

### Requirement: WalletService getBalance
The system SHALL have unit tests for `walletService.getWallets` (balance query).

#### Scenario: Get wallets returns all user wallets
- **WHEN** calling `walletService.getWallets(userId)`
- **THEN** the result SHALL include all wallets for the user ordered by currency
