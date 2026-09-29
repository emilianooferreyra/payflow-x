# Design: Portfolio Social + Price Feeds + Broker Comparison

## Technical Approach

Three new NestJS modules under `src/modules/`, each with its own service and controller. New Prisma models for persistent data (Broker, Portfolio, social). Prices live in Redis only (no DB table) — ephemeral cache with 5-min TTL. All modules reuse existing auth guards and PrismaService.

## Architecture Decisions

### Decision: Prices in Redis only, no DB table

**Choice**: Store prices exclusively in Redis via `@nestjs/cache-manager` + `KeyvRedis`
**Alternatives**: Prisma `Price` table with periodic refresh
**Rationale**: Prices are ephemeral — 5-min TTL and discard. A DB table adds write load, stale data risk, and migration overhead with zero benefit. Redis is already configured globally in AppModule.

### Decision: Fee comparison as a service method, not a separate module

**Choice**: `GET /brokers/compare` inside BrokersModule
**Alternatives**: Dedicated `ComparatorModule`
**Rationale**: The comparison is purely calculatory — read brokers, apply fee formula, sort. Doesn't warrant its own module. Keeps domain boundaries clean: broker data lives in `brokers/`.

### Decision: Portfolio social in a single `social/` module

**Choice**: One module for portfolios, assets, follows, comments
**Alternatives**: Split into `portfolios/` and `social/` (comments/follows)
**Rationale**: These are tightly coupled — portfolio is the aggregate root, comments and follows are child entities. Single module keeps transactions simple and avoids circular imports.

## Data Flow

    Frontend (Expo) ──→ NestJS API ──→ Prisma/PostgreSQL (Brokers, Portfolios)
                           │
                     PricesService
                      ↕     ↕
                 Yahoo Fin.  CoinGecko
                      ↕     ↕
                    Redis (cache, 5min)

    GET /brokers/compare?amount=1000&assetType=CRYPTO&country=AR
        1. Read brokers filtered by country + assetType
        2. For each: calculate feeAmount = min(max(amount * feeBuy%, minFee), maxFee)
        3. Sort by totalCost ascending
        4. Return array with name, feePercent, feeAmount, totalCost, youGet

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Add Broker, Portfolio, PortfolioAsset, PortfolioFollow, PortfolioComment, Visibility, FollowType + CEDEAR AssetTypeEnum |
| `src/modules/brokers/brokers.module.ts` | Create | Module registration |
| `src/modules/brokers/brokers.service.ts` | Create | CRUD + compare logic |
| `src/modules/brokers/brokers.controller.ts` | Create | Endpoints: POST, GET, PUT, DELETE, GET /compare |
| `src/modules/brokers/dto/create-broker.dto.ts` | Create | Validation schema |
| `src/modules/brokers/dto/update-broker.dto.ts` | Create | Partial of create |
| `src/modules/brokers/dto/compare-query.dto.ts` | Create | Amount + assetType + country |
| `src/modules/prices/prices.module.ts` | Create | Module registration |
| `src/modules/prices/prices.service.ts` | Create | Fetch + cache logic |
| `src/modules/prices/prices.controller.ts` | Create | GET /:symbol and GET ?symbols= |
| `src/modules/social/social.module.ts` | Create | Module registration |
| `src/modules/social/social.service.ts` | Create | Portfolio CRUD, assets, follow, comment |
| `src/modules/social/social.controller.ts` | Create | All social endpoints |
| `src/modules/social/dto/*` | Create | DTOs for create/update/add-asset |
| `src/app.module.ts` | Modify | Register BrokersModule, PricesModule, SocialModule |

## Interfaces / Contracts

```typescript
// Prices
interface PriceResult {
  symbol: string;
  price: number;
  source: "YAHOO" | "COINGECKO";
  currency: string;
  timestamp: number;
}

// Fee comparison
interface CompareResult {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  feePercent: number;
  feeAmount: number;
  spread: number;
  totalCost: number;
  youGet: number;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | BrokersService.compare() formula | Mock Prisma, verify fee calculation and sorting |
| Unit | SocialService.verifyOwnership | Test owner vs non-owner scenarios |
| Unit | PricesService cache hit/miss | Mock Cache and fetch, verify TTL behavior |
| Integration | All endpoints via controller specs | Mock services, verify HTTP responses |

## Migration

`pnpm prisma migrate dev` for new tables. No data migration needed — all new tables.

## Open Questions

None. Design is ready for task breakdown.
