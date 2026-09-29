## 1. Schema y datos

- [x] 1.1 Agregar modelo `Broker` a `prisma/schema.prisma` (según design D1)
- [x] 1.2 `pnpm prisma migrate dev --name add_broker --create-only` → revisar SQL → aplicar (vía túnel socat si persiste conflicto de puerto 5432)
- [x] 1.3 `pnpm prisma generate`
- [x] 1.4 Agregar `broker` a `src/common/testing/mock-prisma.ts`
- [x] 1.5 Seed idempotente (upsert por slug) de los 6 brokers verificados en `prisma/seed.ts`

## 2. BrokersModule (TDD)

- [x] 2.1 `src/modules/brokers/constants/market.constants.ts` — derechos BYMA 0,05% + IVA 21% con fuente y vigencia
- [x] 2.2 Spec `brokers.service.spec.ts` (rojo): findActive solo activos, orden por feeBuyPct asc; getTariff devuelve { meta, brokers }
- [x] 2.3 `brokers.service.ts` (verde)
- [x] 2.4 Spec `brokers.controller.spec.ts` (rojo): GET / delega en getTariff
- [x] 2.5 `brokers.controller.ts` — GET /brokers SIN JwtAuthGuard, decoradores Swagger
- [x] 2.6 `brokers.module.ts` + registro en `app.module.ts` + `.addTag("Brokers", ...)` en `main.ts`

## 3. Cierre

- [x] 3.1 `pnpm test` — suite completa verde
- [x] 3.2 `pnpm tsc --noEmit` — cero errores
- [x] 3.3 Verificar público: curl sin cookie a /api/v1/brokers → 200 (6 brokers + meta); /api/v1/portfolio → 403 (CsrfGuard antes que JWT — protegido igual). Requirió `@SkipCsrf()` en el controller (ver design D3 corregido)
