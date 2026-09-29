## Why

El producto es un dashboard fintech para LATAM (inspirado en Takenos) con frontend web Next.js ya conectado a la API; una app mobile es objetivo futuro y motiva decisiones API-first (paginación cursor, respuestas ligeras). Phase A es el portfolio tracker: el usuario ve qué tiene, cuánto vale hoy, y su P&L. Es la base sobre la que se iterará con broker comparison (Phase B) y features sociales opcionales (Phase C).

## What Changes

- **NEW**: `Portfolio` model — portfolio del usuario con nombre, descripción y visibilidad futura
- **NEW**: `PortfolioAsset` model — asset dentro de un portfolio (símbolo, tipo, cantidad, precio promedio, moneda)
- **NEW**: `src/modules/prices/` — servicio de precios en vivo (Finnhub + CoinGecko) con Redis cache
- **NEW**: `src/modules/portfolio/` — CRUD de portfolios y assets, endpoint de valuación separado
- **MODIFIED**: `prisma/schema.prisma` — nuevos modelos + enum AssetType ampliado
- **MODIFIED**: `src/app.module.ts` — registrar nuevos módulos

## Capabilities

### New Capabilities
- `price-feeds`: Obtención de precios en vivo para stocks (Finnhub) y crypto (CoinGecko) con Redis cache de 5 min. Endpoints para símbolo único y batch, con auth JWT requerida (ver design D4).
- `portfolio-tracker`: CRUD de portfolios y assets. Valuación asíncrona vía endpoint separado (mobile-friendly). Auth JWT requerida.

### Modified Capabilities
<!-- Sin cambios de specs existentes -->

## Impact

| Área | Impacto |
|------|---------|
| `prisma/schema.prisma` | Add Portfolio, PortfolioAsset, extender AssetTypeEnum |
| `src/modules/prices/` | Nuevo módulo completo |
| `src/modules/portfolio/` | Nuevo módulo completo |
| `src/app.module.ts` | Registrar PricesModule, PortfolioModule |
| `src/common/` | Sin cambios |

## Decisiones de arquitectura (pre-acordadas)

- **Valuación separada**: `GET /portfolio/:id/valuation` devuelve precios actuales × cantidad. Permite que React Native muestre el portfolio instantáneamente y cargue la valuación en background.
- **Moneda base USD**: toda valuación se expresa en USD. ARS/BRL vía ExchangeRate queda para Phase B.
- **Sin social en este change**: PortfolioFollow y PortfolioComment son Phase C. El modelo `Portfolio` tiene campo `visibility` como placeholder pero no se usa todavía.
- **Paginación cursor-based desde el día 1**: todos los listados usan `cursor`/`limit` para compatibilidad con listas infinitas en mobile.
- **Proveedores de precios**: Finnhub (stocks/ETFs/CEDEARs, API key gratuita) + CoinGecko (crypto, sin key). Yahoo Finance descartado por no tener API oficial (ver design D4).

## Relación con `investment` (dominio existente)

`investment` y `portfolio` son bounded contexts SEPARADOS y esta separación es intencional:

- **`investment`** (`/api/v1/investments/*`) — trading interno TRANSACCIONAL: compra/venta de assets del catálogo (`Asset`/`Investment`) usando fondos del wallet del usuario. Mueve dinero real, tiene custodia.
- **`portfolio`** (`/api/v1/portfolio/*`) — tracker INFORMACIONAL: holdings externos que el usuario declara manualmente (`Portfolio`/`PortfolioAsset`). Solo valuación con precios en vivo; no toca wallets ni custodia nada.

Regla de diseño: ningún código de `portfolio/` puede depender de `wallet/` ni de `investment/`. Ambos módulos consumen `prices/` como servicio compartido. Una eventual unificación (investment absorbe portfolio o viceversa) queda como opción para una fase futura, no como compromiso.
