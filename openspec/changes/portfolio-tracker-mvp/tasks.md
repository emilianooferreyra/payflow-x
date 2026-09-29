## 1. Schema Prisma

- [x] 1.1 Agregar `AssetType` enum: STOCK, CRYPTO, ETF, BOND, CEDEAR, FCI
- [x] 1.2 Agregar `Visibility` enum: PUBLIC, PRIVATE
- [x] 1.3 Agregar modelo `Portfolio` (id, userId, name, description, visibility, timestamps) con relación a User
- [x] 1.4 Agregar modelo `PortfolioAsset` (id, portfolioId, symbol, type, quantity, avgBuyPrice, currency, timestamps)
- [x] 1.5 Agregar relaciones `portfolios` en modelo `User`
- [x] 1.6 Run `pnpm prisma migrate dev --name portfolio-tracker` — migración `20260714142718_portfolio_tracker`
- [x] 1.7 Run `pnpm prisma generate`

## 2. PricesModule

- [x] 2.1 Agregar `FINNHUB_API_KEY` a `src/config/envs.ts` (z.string().default("")) — hecho en envs.ts; PENDIENTE manual: agregar la línea a `.env.template` (archivo protegido por permisos del agente)
- [x] 2.2 Crear `src/modules/prices/interfaces/price.interfaces.ts` — `PriceResult { symbol, price, source, currency, timestamp }`
- [x] 2.3 Crear `src/modules/prices/crypto-symbols.ts` — mapa `symbol → coinGeckoId` (ej: `BTC → bitcoin`, `ETH → ethereum`, `SOL → solana`)
- [x] 2.4 Crear `src/modules/prices/prices.service.ts`
  - `getPrice(symbol)`: cache lookup → si crypto (está en mapa) → CoinGecko; si no → Finnhub → cache set → return
  - `getPrices(symbols[])`: `Promise.all` de `getPrice`, devolver `null` por símbolo en error individual
  - Finnhub: `GET https://finnhub.io/api/v1/quote?symbol=<symbol>&token=<key>` → `{ c: currentPrice }`
  - CoinGecko: `GET https://api.coingecko.com/api/v3/simple/price?ids=<coinId>&vs_currencies=usd`
  - Redis key: `price:<symbol>`, TTL 300_000 ms (5 min)
  - Degradación graceful si Redis caído: fetch directo sin cachear
- [x] 2.5 Crear `src/modules/prices/prices.controller.ts`
  - GET /prices/:symbol — `@UseGuards(JwtAuthGuard)` — 404 si no hay precio
  - GET /prices?symbols= — `@UseGuards(JwtAuthGuard)` — 400 si symbols vacío
- [x] 2.6 Crear `src/modules/prices/prices.module.ts` — exporta PricesService; registrado en app.module + tag Swagger "Prices"

## 3. PortfolioModule

- [x] 3.1 Crear DTOs:
  - `src/modules/portfolio/dto/create-portfolio.dto.ts` — name (required), description (optional)
  - `src/modules/portfolio/dto/update-portfolio.dto.ts` — PartialType de create
  - `src/modules/portfolio/dto/add-asset.dto.ts` — symbol, type (AssetType), quantity, avgBuyPrice, currency
  - `src/modules/portfolio/dto/portfolio-query.dto.ts` — limit (default 20, max 100), cursor (optional)
- [x] 3.2 Crear `src/modules/portfolio/portfolio.service.ts`
  - `create(userId, dto)` → Prisma create
  - `findAll(userId, query)` → cursor-based pagination, solo portfolios del userId
  - `findOne(userId, id)` → findUnique + verificar userId === portfolio.userId (403 si no)
  - `update(userId, id, dto)` → verificar ownership → update
  - `delete(userId, id)` → verificar ownership → delete cascade
  - `addAsset(userId, portfolioId, dto)` → verificar ownership → create PortfolioAsset
  - `removeAsset(userId, portfolioId, assetId)` → verificar ownership → delete
  - `getValuation(userId, id)` → findOne assets → `PricesService.getPrices(symbols)` → calcular valueUSD, pnl, pnlPercent
- [x] 3.3 Crear `src/modules/portfolio/portfolio.controller.ts` — todos los endpoints con `@UseGuards(JwtAuthGuard)`
- [x] 3.4 Crear `src/modules/portfolio/portfolio.module.ts` — importar PricesModule

## 4. Wiring

- [x] 4.1 Registrar `PricesModule` y `PortfolioModule` en `src/app.module.ts` + tags Swagger en main.ts
- [x] 4.2 Run `pnpm tsc --noEmit` — zero errors

## 5. Tests

- [x] 5.1 Unit test `PricesService`: cache hit (no llama fetch), cache miss Finnhub (stock), cache miss CoinGecko (crypto), Redis caído (fetch directo), símbolo inválido (null sin romper batch) — 8 tests
- [x] 5.2 Unit test `PortfolioService.getValuation`: P&L correcto, precio null no rompe el array
- [x] 5.3 Unit test `PortfolioService`: 403 cuando userId no coincide con portfolio.userId (16 tests en portfolio.service.spec.ts + 5 en prices.controller.spec.ts)
- [x] 5.4 Run `pnpm test` — todos los tests pasan (32 suites, 218 tests) + `pnpm tsc --noEmit` limpio
