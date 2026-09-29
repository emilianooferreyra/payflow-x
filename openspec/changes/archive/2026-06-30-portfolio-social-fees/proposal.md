# Proposal: Portfolio Social + Price Feeds + Broker Comparison

## Intent

Add new domain modules to transform the fintech backend into a social portfolio tracker + broker fee comparison platform. Users can create portfolios, track performance with live prices, follow creators, and compare fees across brokers.

## Scope

### In Scope
- `Price` model + `PricesModule` — cache live prices from Yahoo Finance, CoinGecko (Redis)
- `Broker` model + `BrokersModule` — broker catalog with fee structures per country
- `Portfolio` + `PortfolioAsset` — user-created portfolios with asset allocation
- `PortfolioFollow` + `PortfolioComment` — social layer (follow, comment)
- `ExchangeRate` integration — Bluelytics + ExchangeRate-API for ARS/BRL conversion
- Endpoints: CRUD portfolios, list/follow portfolios, list brokers, compare fees

### Out of Scope
- Subscription/payment system (premium portfolios)
- Crowdsourced broker fee reporting
- Push notifications
- Admin dashboard

## Approach

New Prisma models in existing schema, new NestJS modules under `src/modules/`, all sharing existing auth guards and PrismaService. Price caching via existing Redis config.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | Add Price, Broker, Portfolio + social models |
| `src/modules/prices/` | New | Price fetcher + cache service |
| `src/modules/brokers/` | New | Broker CRUD + fee data |
| `src/modules/social/` | New | Portfolio CRUD, follow, comment |
| `src/modules/comparator/` | New | Cross-broker price comparison endpoint |
| `src/app.module.ts` | Modified | Register new modules |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Yahoo Finance rate limits | Low | Cache 5 min in Redis; fallback to last known price |
| CoinGecko API changes | Medium | Isolate behind adapter interface |
| Broker fee data outdated | Medium | Manual entry with `updatedAt` tracking; flag stale entries |

## Rollback Plan

Remove migrations, delete new modules, revert `app.module.ts`. No existing tables or modules are affected.

## Dependencies

- Redis already configured
- Yahoo Finance (no key required)
- CoinGecko free tier (30 req/min)
- Bluelytics free API
- ExchangeRate-API (free tier, signup optional)

## Success Criteria

- [ ] Price cache returns data with <100ms latency
- [ ] Portfolio CRUD works with auth guards
- [ ] Follow/unfollow portfolio returns correct follower count
- [ ] Comparator endpoint returns ordered brokers by total cost
