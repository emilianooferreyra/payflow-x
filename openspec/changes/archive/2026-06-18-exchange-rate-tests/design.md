# Technical Design — ExchangeRateService Tests

## Approach
- Tests unitarios con Jest + `@nestjs/testing`
- Usar `createTestingModule([ExchangeRateService])` para bootstrapping
- Mockear `PrismaService` via `mockPrisma` centralizado
- Mockear `fetch` global para `refresh()` usando `jest.spyOn(global, 'fetch')`
- Mockear `process.env.EXCHANGE_RATE_API_KEY` con `beforeEach`/`afterEach`

## File
- `src/modules/exchange-rate/exchange-rate.service.spec.ts`

## Test Structure
```
describe("ExchangeRateService")
  describe("getCurrent")
    it("returns all supported pairs")
    it("filters out null results")
    it("returns empty array when no rates")
  describe("getRate")
    it("returns the latest rate for a valid pair")
    it("throws NotFoundException when pair has no rate")
  describe("getHistory")
    it("returns last 30 rates in ascending order")
    it("throws NotFoundException when no history exists")
  describe("refresh")
    it("returns message when API key is not configured")
    it("fetches from external API and creates 6 rates")
    it("propagates fetch network error")
```

## Mock Patterns
- `mockPrisma.exchangeRate.findFirst` → for getRate, getCurrent
- `mockPrisma.exchangeRate.findMany` → for getHistory
- `mockPrisma.exchangeRate.createMany` → for refresh
- `jest.spyOn(global, 'fetch')` → mock external HTTP
- `beforeEach` → `jest.clearAllMocks()` + env var setup
