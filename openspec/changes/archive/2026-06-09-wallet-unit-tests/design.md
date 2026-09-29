# Design: WalletService Unit Tests

## Approach
- Use existing `mockPrisma` and `createTestingModule` from `src/common/testing/`
- Mock `$transaction` to execute callbacks with `mockPrisma`
- Set up mockResolvedValue for wallet lookups, updates, and transaction creation
- Test both happy paths (balance changes, transaction creation) and error paths (not found, insufficient balance)

## Test structure
```
describe("WalletService")
  describe("getWallets") — 2 tests
  describe("deposit") — 2 tests
  describe("withdraw") — 3 tests
  Total: ~7 tests
```
