## ADDED Requirements

### Requirement: WalletService unit tests
The system SHALL have unit tests for WalletService covering balance queries, deposits, withdrawals, and transfers.

#### Scenario: Deposit increases balance
- **WHEN** calling `walletService.deposit(userId, currency, amount)`
- **THEN** the wallet balance SHALL increase by the deposited amount

#### Scenario: Withdrawal decreases balance
- **WHEN** calling `walletService.withdraw(userId, currency, amount)` with sufficient balance
- **THEN** the wallet balance SHALL decrease by the withdrawn amount

#### Scenario: Withdrawal fails on insufficient balance
- **WHEN** calling `walletService.withdraw(userId, currency, amount)` with insufficient balance
- **THEN** the operation SHALL throw an error

#### Scenario: Transfer moves funds between wallets
- **WHEN** calling `walletService.transfer(fromUserId, toWalletId, amount)`
- **THEN** the sender balance SHALL decrease and receiver balance SHALL increase

### Requirement: TransactionService unit tests
The system SHALL have unit tests for TransactionService covering creation, pagination, and filtering.

#### Scenario: Create transaction
- **WHEN** calling `transactionService.create(data)`
- **THEN** a new transaction SHALL be created with the given data

#### Scenario: Get transactions by wallet
- **WHEN** calling `transactionService.getByWallet(walletId)`
- **THEN** the result SHALL include transactions for that wallet

### Requirement: InvestmentService unit tests
The system SHALL have unit tests for InvestmentService covering buy, sell, and portfolio queries.

#### Scenario: Buy investment updates portfolio
- **WHEN** calling `investmentService.buy(userId, assetId, quantity, price)`
- **THEN** the user SHALL have the investment with calculated avgBuyPrice

#### Scenario: Sell investment reduces quantity
- **WHEN** calling `investmentService.sell(investmentId, quantity)`
- **THEN** the investment quantity SHALL decrease

#### Scenario: Get portfolio returns user investments
- **WHEN** calling `investmentService.getPortfolio(userId)`
- **THEN** the result SHALL include all investments for the user
