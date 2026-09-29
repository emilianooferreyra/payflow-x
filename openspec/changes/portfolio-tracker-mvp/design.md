## Context

Backend NestJS 11 para una app React Native (sin iniciar). El frontend va a consumir estos endpoints desde mobile — eso dicta decisiones de respuesta ligera, carga asíncrona de datos pesados (precios), y paginación cursor desde el inicio. El usuario tiene portfolios con assets en distintas monedas; valuación siempre en USD para este MVP.

## Goals / Non-Goals

**Goals:**
- CRUD de portfolios y assets con auth JWT
- Precios en vivo con cache Redis (no llamar APIs externas en cada request)
- Endpoint de valuación separado del detalle del portfolio (mobile UX)
- Schema Prisma extensible para broker comparison (Phase B) sin breaking changes
- Paginación cursor-based en todos los listados

**Non-Goals:**
- ExchangeRate ARS/BRL (Phase B)
- Broker comparison (Phase B — change separado)
- Social layer: follows, comments, feed (Phase C)
- Websockets / precios en tiempo real (futuro)
- Admin panel

## Decisions

### D1 — Dos módulos separados: `prices/` y `portfolio/`

`PricesModule` es independiente — va a ser consumido también por el futuro `BrokersModule` para calcular fees sobre precio real. Si lo metemos dentro de `portfolio/`, lo tenemos que extraer después. La separación ahora es gratis.

### D2 — Valuación como endpoint separado

```
GET /portfolio/:id          → datos estáticos (assets, nombre, descripción) — rápido
GET /portfolio/:id/valuation → precio_actual × cantidad por asset — puede tardar
```

React Native muestra la primera pantalla inmediatamente, lanza la segunda en background, y actualiza el UI cuando llegan los precios. Alternativa (todo junto) fue descartada: bloquea el render hasta que todos los precios estén disponibles.

### D3 — Paginación cursor-based

```ts
// Request
GET /portfolio?limit=20&cursor=<lastId>

// Response
{ data: [...], nextCursor: "<id>" | null }
```

Offset-based fue descartado: en mobile con listas infinitas, el offset se desincroniza si se insertan items mientras el usuario scrollea.

### D4 — Proveedores de precios: Finnhub (stocks) + CoinGecko (crypto)

**Decisión:** Finnhub para stocks (incluyendo BYMA/CEDEARs), CoinGecko para crypto.

| Proveedor | Uso | Free tier | API key |
|-----------|-----|-----------|---------|
| Finnhub | Stocks, ETFs, CEDEARs (BYMA) | 60 req/min | Sí, gratuita |
| CoinGecko | Crypto (BTC, ETH, etc.) | 30 req/min | No requerida |

Yahoo Finance descartado: sin API oficial, scraping frágil y sin SLA. Polygon.io descartado: LATAM solo en planes pagos.

**Detección de proveedor por símbolo:**
- Lista de crypto conocidos (BTC, ETH, SOL, USDT, etc.) → CoinGecko con coin ID mapeado
- Todo lo demás → Finnhub con símbolo directo (ej: `AAPL`, `BYMA:YPF`)

**Cache Redis TTL 5 min, key `price:<symbol>`:**
```ts
// Cache miss: fetch → set en Redis → return
// Cache hit: return directo sin llamar API externa
```

Sin tabla Prisma para precios — son efímeros. Si Redis está caído, fetch directo sin cache (degradación graceful).

**Variables de entorno requeridas:**
```
FINNHUB_API_KEY=<gratuita en finnhub.io>
```

### D5 — AssetType enum extensible

```prisma
enum AssetType {
  STOCK
  CRYPTO
  ETF
  BOND
  CEDEAR    // mercado argentino
  FCI       // fondos comunes de inversión LATAM
}
```

`CEDEAR` y `FCI` son tipos clave para LATAM. Se agregan ahora aunque el comparador no esté, para no migrar el enum en Phase B.

### D6 — `Portfolio.visibility` como placeholder

El campo existe en el schema (`PUBLIC | PRIVATE`) pero no se valida ni filtra en este change. El listado `GET /portfolio` devuelve solo los portfolios del usuario autenticado. Cuando llegue Phase C (social feed), el filtro ya está en el modelo.

### D7 — Separación investment / portfolio

Ya existe `src/modules/investment/` (`getPortfolio`, `buy`, `sell` sobre `Asset`/`Investment`): es el dominio TRANSACCIONAL — mueve fondos del wallet y custodia posiciones compradas en la app. `portfolio/` es el dominio INFORMACIONAL — holdings externos declarados a mano, solo lectura y valuación.

Se mantienen separados porque tienen invariantes distintas: un bug en el tracker jamás debe poder tocar el flujo de dinero. `portfolio/` NO importa `wallet/` ni `investment/`; ambos comparten únicamente `prices/`. Unificación futura: posible, no comprometida.

## Endpoints

```
PricesModule
  GET  /prices/:symbol           → { symbol, price, source, currency, timestamp }
  GET  /prices?symbols=A,B,C     → [PriceResult]

PortfolioModule
  POST   /portfolio               → crear portfolio
  GET    /portfolio               → listar mis portfolios (cursor-based)
  GET    /portfolio/:id           → detalle + assets
  PUT    /portfolio/:id           → actualizar
  DELETE /portfolio/:id           → eliminar (cascade assets)

  POST   /portfolio/:id/assets    → agregar asset
  DELETE /portfolio/:id/assets/:assetId → eliminar asset

  GET    /portfolio/:id/valuation → { totalValueUSD, assets: [{ symbol, currentPrice, value, pnl, pnlPercent }] }
```

Todos los endpoints de `portfolio/` requieren `JwtAuthGuard`.
Los endpoints de `prices/` también requieren `JwtAuthGuard` (solo usuarios registrados).

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Finnhub rate limit 60 req/min en free tier | Redis cache 5 min lo absorbe; en escala subir a plan paid (~$0/mes hasta 300k calls/mes) |
| CoinGecko cambia coin IDs o estructura de respuesta | Mapa de símbolo → coinId centralizado en constante; fácil de actualizar |
| BYMA symbols en Finnhub pueden diferir del símbolo local | Documentar convención: `BYMA:YPF` para acciones argentinas; CEDEAR usa el símbolo subyacente (ej: `AAPL`) |
| Cache miss en batch de símbolos → N llamadas a API externa | Paralelizar con `Promise.all` + timeout por símbolo; fallar silenciosamente y devolver `null` en lugar de error global |
| P&L incorrecto si `avgBuyPrice` está en otra moneda que el precio actual | Para MVP: asumir que `avgBuyPrice` siempre es en la misma moneda que el precio (USD). Documentar la limitación. |
