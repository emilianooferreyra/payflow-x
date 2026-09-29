## Why

Wedge de validación del producto comparador (ver `openspec/explorations/2026-07-14-comparador-personalizado.md` §8): una página pública que responde "¿cuánto te cuesta DE VERDAD invertir $X en CEDEARs en cada broker argentino?". Es el único hueco del research de mercado sin herramienta existente (solo notas editoriales desactualizadas). Objetivo: usuarios reales validando en comunidades (r/merval, Twitter finanzas AR) antes de construir el resto del roadmap. **Regla acordada: nada más del roadmap se toca hasta que esto esté en producción.**

## What Changes

- **NEW**: modelo `Broker` en Prisma — tarifario curado a mano con fuentes citadas y `lastVerifiedAt`
- **NEW**: `src/modules/brokers/` — `GET /brokers` PÚBLICO (sin JWT): tarifario activo + meta de mercado (derechos BYMA, IVA)
- **NEW**: constantes de mercado (derechos BYMA 0,05% vigente 01/10/2025, IVA 21%) con fuente
- **MODIFIED**: `prisma/seed.ts` — seed de los 6 brokers verificados
- **MODIFIED**: `src/app.module.ts`, `src/main.ts` — registro + tag Swagger "Brokers"

El frontend (payflow-front, ruta pública `/cedears`) consume este endpoint; la matemática del comparador vive en el cliente. El cálculo NO es parte de este change de backend.

## Capabilities

### New Capabilities
- `brokers-tariff`: tarifario público de brokers para CEDEARs — comisiones compra/venta, custodia, suscripciones, notas, fuentes y fecha de verificación.

### Modified Capabilities
<!-- Ninguna -->

## Relación con el dominio (lección D7)

Este módulo es el primer ladrillo del `FeeSchedule`/`Provider` de la exploración del comparador. NO depende de `portfolio/`, `prices/`, `wallet/` ni `investment/` — es un dominio de datos curados, aislado y de solo lectura pública. Si el wedge valida, evoluciona hacia el dominio Provider/FeeSchedule; si no, se descarta sin tocar nada más.

## Impact

| Área | Impacto |
|------|---------|
| `prisma/schema.prisma` | + modelo `Broker` (migración dedicada) |
| `src/modules/brokers/` | Módulo nuevo completo |
| `prisma/seed.ts` | + seed de 6 brokers |
| `src/app.module.ts`, `src/main.ts` | Registro + Swagger tag |
| Resto de la API | Sin cambios — sigue protegida por JWT |

## Decisiones pre-acordadas (con Emi, 2026-07-14)

- Datos en el backend (endpoint), no estáticos en el front.
- Cálculo v1: compra + venta + custodia — "costo total ida y vuelta".
- Brokers v1: IOL, Balanz, PPI, Cocos, Bull Market, IEB+ (datos curados con fuentes, verificados por Emi).
- Se compara el PLAN BASE de cada broker; los planes pagos (Cocos Gold/Pro) van como nota visible.
- IEB+ obligó a modelar suscripción mensual (`subscriptionMonthlyArs`) además de comisión porcentual.
- Derechos de mercado BYMA como constante global (0,05%, uniforme para todos), no por broker.
