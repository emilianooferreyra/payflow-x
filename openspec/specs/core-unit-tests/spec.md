## ADDED Requirements

### Requirement: HashService tests
The system SHALL have unit tests for HashService covering hash creation and verification.

#### Scenario: HashService hashes a password
- **WHEN** calling `hashService.hash("plainPassword")`
- **THEN** the result SHALL be a non-empty string different from the input

#### Scenario: HashService verifies correct password
- **WHEN** calling `hashService.verify(hashed, "plainPassword")` with the matching password
- **THEN** the result SHALL be true

#### Scenario: HashService rejects wrong password
- **WHEN** calling `hashService.verify(hashed, "wrongPassword")` with a non-matching password
- **THEN** the result SHALL be false

### Requirement: SessionService tests
The system SHALL have unit tests for SessionService covering session creation, refresh, and revocation.

#### Scenario: Create session creates a new session
- **WHEN** calling `sessionService.create(userId, refreshToken, data)`
- **THEN** a new session SHALL be created with isActive=true

#### Scenario: Rotate refresh token deactivates old session
- **WHEN** calling `sessionService.rotateRefreshToken(oldSessionId, newRefreshToken)`
- **THEN** the old session SHALL have isActive=false and a new session SHALL be created

### Requirement: UsersService tests
The system SHALL have unit tests for UsersService covering user creation and lookup.

#### Scenario: Create user
- **WHEN** calling `usersService.create({ email, password, name, country, language })`
- **THEN** a new user SHALL be created with status=DRAFT and authProvider=LOCAL

### Requirement: PrismaService tests
The system SHALL have unit tests ensuring PrismaService initializes and extends PrismaClient correctly.

#### Scenario: PrismaService extends PrismaClient
- **WHEN** inspecting PrismaService instance
- **THEN** it SHALL be an instance of PrismaClient

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
