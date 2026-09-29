## 1. Auth E2E Tests

- [x] 1.1 Create `test/auth.e2e-spec.ts` with supertest setup and mocked Prisma
- [x] 1.2 Write test: register returns 201 and sets auth cookies
- [x] 1.3 Write test: login with valid credentials returns 200 and sets cookies
- [x] 1.4 Write test: refresh with valid refresh_token cookie returns new tokens
- [x] 1.5 Write test: logout clears auth cookies
- [ ] 1.6 Run `npm run test:e2e` and verify tests pass

## 2. WalletService Unit Tests

- [ ] 2.1 Read current WalletService to understand methods and dependencies
- [ ] 2.2 Write tests for `deposit` (balance increase, transaction creation)
- [ ] 2.3 Write tests for `withdraw` (balance decrease, insufficient balance error)
- [ ] 2.4 Write tests for `transfer` (sender decrease, receiver increase)
- [ ] 2.5 Write tests for `getBalance` (returns correct balance)
- [ ] 2.6 Run `npm run test` and verify all pass

## 3. TransactionService Unit Tests

- [ ] 3.1 Read current TransactionService to understand methods
- [ ] 3.2 Write tests for `create` transaction
- [ ] 3.3 Write tests for `getByWallet` with pagination
- [ ] 3.4 Write tests for filtering by type and status
- [ ] 3.5 Run `npm run test` and verify all pass

## 4. InvestmentService Unit Tests

- [ ] 4.1 Read current InvestmentService to understand buy/sell logic
- [ ] 4.2 Write tests for `buy` (updates portfolio, avgBuyPrice calculation)
- [ ] 4.3 Write tests for `sell` (quantity decrease)
- [ ] 4.4 Write tests for `getPortfolio` (returns all user investments)
- [ ] 4.5 Run `npm run test` and verify all pass

## 5. Utility Error Handling

- [ ] 5.1 Read current TokensService and identify all generic catch blocks
- [ ] 5.2 Replace generic errors with contextual errors in TokensService
- [ ] 5.3 Read current EmailsService and identify all generic catch blocks
- [ ] 5.4 Replace generic errors with contextual errors in EmailsService
- [ ] 5.5 Run `npm run test` and verify all pass
- [ ] 5.6 Run `npx tsc --noEmit` and verify zero compilation errors
