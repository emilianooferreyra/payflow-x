# Tasks: Portfolio Social + Price Feeds + Broker Comparison

## Phase 1: Foundation (Prisma models)

- [ ] 1.1 Add Broker, Portfolio, PortfolioAsset, PortfolioFollow, PortfolioComment models to `prisma/schema.prisma`
- [ ] 1.2 Add CEDEAR to AssetTypeEnum, add Visibility and FollowType enums
- [ ] 1.3 Add portfolio relations (portfolios, portfolioFollows, portfolioComments) to User model
- [ ] 1.4 Run `pnpm prisma generate`
- [ ] 1.5 Run `pnpm prisma migrate dev --name portfolio-social-fees`

## Phase 2: PricesModule

- [ ] 2.1 Create `src/modules/prices/prices.module.ts`
- [ ] 2.2 Create `src/modules/prices/prices.service.ts` — fetch from Yahoo Finance and CoinGecko with Redis cache via CACHE_MANAGER
- [ ] 2.3 Create `src/modules/prices/prices.controller.ts` — GET /prices/:symbol, GET /prices?symbols=A,B,C

## Phase 3: BrokersModule

- [ ] 3.1 Create `src/modules/brokers/dto/create-broker.dto.ts` and `src/modules/brokers/dto/update-broker.dto.ts`
- [ ] 3.2 Create `src/modules/brokers/dto/compare-query.dto.ts`
- [ ] 3.3 Create `src/modules/brokers/brokers.service.ts` — CRUD + compare logic with fee calculation
- [ ] 3.4 Create `src/modules/brokers/brokers.controller.ts` and `src/modules/brokers/brokers.module.ts`

## Phase 4: SocialModule

- [ ] 4.1 Create `src/modules/social/dto/create-portfolio.dto.ts`, `update-portfolio.dto.ts`, `add-asset.dto.ts`
- [ ] 4.2 Create `src/modules/social/social.service.ts` — portfolio CRUD, asset management, follow/unfollow, comments
- [ ] 4.3 Create `src/modules/social/social.controller.ts` and `src/modules/social/social.module.ts`

## Phase 5: Wiring

- [ ] 5.1 Register BrokersModule, PricesModule, SocialModule in `src/app.module.ts`
- [ ] 5.2 Run `pnpm tsc --noEmit` and fix any type errors

## Phase 6: Tests

- [ ] 6.1 Write unit tests for BrokersService.compare() fee calculation
- [ ] 6.2 Write unit tests for SocialService.verifyOwnership (owner vs non-owner)
- [ ] 6.3 Write unit tests for PricesService cache hit/miss behavior
- [ ] 6.4 Run `pnpm test` and verify all pass
