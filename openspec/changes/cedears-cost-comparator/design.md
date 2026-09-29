## Context

Wedge de validación (ver proposal). Backend sirve el TARIFARIO curado; la matemática del comparador vive en el cliente (recalcula al tipear, sin request por tecla). Endpoint público de solo lectura.

## Decisions

### D1 — Modelo `Broker` flexible para dos modelos de cobro

El research reveló dos esquemas: comisión porcentual (IOL, Balanz, PPI, Cocos, Bull Market) y suscripción mensual con 0% comisión (IEB+). El modelo cubre ambos:

```prisma
model Broker {
  id          String  @id @default(uuid())
  slug        String  @unique
  name        String

  feeBuyPct   Decimal  @db.Decimal(6, 3)   // % sobre monto, plan base
  feeSellPct  Decimal  @db.Decimal(6, 3)
  feeMaxPct   Decimal? @db.Decimal(6, 3)   // PPI: rango 0,60–1,50
  feeMinArs   Decimal? @db.Decimal(12, 2)  // mínimo por operación si existe
  ivaOnFees   Boolean  @default(true)

  subscriptionMonthlyArs Decimal? @db.Decimal(12, 2) // IEB+: $5.000/mes
  subscriptionNotes      String?

  custodyPctAnnual     Decimal? @db.Decimal(6, 3)
  custodyMinMonthlyArs Decimal? @db.Decimal(12, 2)
  custodyNotes         String?

  feeNotes       String?
  sources        Json     // [{ label, url }]
  lastVerifiedAt DateTime
  isActive       Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### D2 — Derechos de mercado como constante global, no por broker

BYMA cobra 0,05% (3 bps negociación + 2 post-trade, vigente 01/10/2025 — fuente: byma.com.ar/newsroom/aranceles-de-rv) uniforme. Va en `src/modules/brokers/constants/market.constants.ts` con fuente y fecha, y se devuelve en `meta` de la respuesta. Si algún día un broker bonifica derechos, se migra a campo por broker.

### D3 — Endpoint público sin JWT ni CSRF

Los controllers del repo aplican `JwtAuthGuard` explícitamente (no global) → omitirlo hace público el endpoint. `ThrottlerGuard` global (60 req/min) cubre abuso.

**Corrección post-verificación e2e**: el `CsrfGuard` global SÍ valida GETs (usa `validateRequest` de csrf-csrf directamente, que no exime métodos seguros — por eso el front pide `/auth/csrf-token` antes de operar). Un GET público de solo lectura no necesita CSRF (CSRF protege mutaciones con cookies de sesión): se aplica `@SkipCsrf()` a nivel de controller, el mecanismo existente del repo (`common/decorators/skip-csrf.decorator.ts`).

### D4 — Respuesta `{ meta, brokers }`

```
GET /api/v1/brokers →
{
  meta: { marketRightsPct: 0.05, ivaPct: 21, marketRightsSource: {...}, updatedAt },
  brokers: [ { slug, name, feeBuyPct, ..., sources, lastVerifiedAt } ]
}
```

El front hace UN fetch server-side (revalidate ~1h) y calcula en el cliente.

### D5 — Seed idempotente

`prisma/seed.ts` hace upsert por `slug` — correr el seed N veces no duplica ni pisa datos manuales posteriores no re-seedeados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Datos desactualizados (brokers cambian tarifas sin aviso) | `lastVerifiedAt` VISIBLE en UI + fuentes linkeadas + disclaimer + rutina de re-verificación semanal |
| Sitios oficiales bloquean fetch automatizado (403 IOL/Balanz/Cocos) | Curación manual asumida por diseño; números de Rankia con fecha + verificación humana de Emi |
| Interpretación errónea de planes (Cocos Gold/Pro, IEB+ Rookie) | Se compara SOLO plan base; notas visibles explican los planes |
