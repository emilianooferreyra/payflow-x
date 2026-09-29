# Exploración: de clon fintech a comparador personalizado de inversiones

**Fecha**: 2026-07-14 · **Estado**: visión validada con research de mercado · **Origen**: conversación de redefinición de producto

## 1. Disparador

payflow nació como "clon de Takenos/Belo", pero esa nunca fue la idea real. La visión clarificada:

> Una plataforma para que el usuario argentino (luego LATAM) decida **dónde le conviene** comprar, vender, invertir e intercambiar — stablecoins, acciones (S&P 500 vía CEDEARs), oro, tecnología — entre las decenas de billeteras y brokers que existen (Takenos, Belo, Lemon, Ripio, Buenbit, Cocos, Prex...). Con una capa social de portfolios.

El usuario investiga y decide acá; ejecuta en la app elegida. **No hay custodia** → no hay licencias.

## 2. Research de mercado (2026-07-14)

### Lo que ya existe — NO construir esto

| Competidor | Qué cubre | Notas |
|---|---|---|
| [CriptoYa](https://criptoya.com) | Precios/spreads cripto por plataforma, dólar, arbitrajes | Gigante del nicho. [API pública](https://docs.criptoya.com/argentina): sin key, 120 req/min |
| [comparatasas.ar](https://comparatasas.ar) | Rendimientos: cuentas remuneradas, FCI, plazos fijos, stablecoins | [Open source](https://github.com/enzonotario/comparatasas.ar) |
| RendimientoHoy, Decentralike, billeterasvirtuales.com.ar, A Cuánto Está, CoinMonitor | Variantes de comparadores de tasas/precios | Nicho saturado |
| Rankia + blogs | Comisiones de brokers (CEDEARs/acciones) | **Solo editorial — no existe herramienta** |
| [getquin](https://getquin.com) | Social portfolio tracker | Global/alemán. Sin datos AR (CEDEARs, TNA pesos, billeteras) |

**Conclusión**: el comparador genérico (tabla igual para todos) está resuelto y regalado. Competir ahí es perder el tiempo.

### El problema de datos está resuelto

- **[ArgentinaDatos](https://argentinadatos.com/docs/operations/get-finanzas-rendimientos)** (MIT, gratis): APYs por entidad y moneda — cubre Belo, Lemon, Ripio, Fiwind, Letsbit, Satoshi Tango, Nexo, etc.
- **[CriptoYa API](https://docs.criptoya.com/argentina)**: precios/spreads por exchange actualizados por minuto, comisiones de retiro, dólar.
- Lo ÚNICO sin API: comisiones de brokers para CEDEARs/acciones → curación manual (y justo ahí no hay competencia de herramientas).

## 3. El hueco: la intersección que nadie ocupa

```
        COMPARADORES              TRACKERS               SOCIAL
     (CriptoYa, tasas)      (getquin, Portseido)      (getquin global)
            │                       │                       │
   "tabla para todos"       "tus holdings"          "carteras públicas"
            │                       │                       │
            └───────────┬───────────┴───────────┬───────────┘
                        │                       │
                        ▼                       ▼
              ╔═══════════════════════════════════════╗
              ║             EL HUECO                  ║
              ║  "¿Dónde me conviene A MÍ, con MIS    ║
              ║   montos y MIS posiciones?"           ║
              ║  + datos locales AR (CEDEARs, TNA,    ║
              ║   stablecoins por billetera)          ║
              ║  + comunidad local                    ║
              ╚═══════════════════════════════════════╝
```

Jobs to be done del usuario:

1. **Decidir**: "tengo $500.000 ARS, quiero S&P 500 / USDT / oro → ¿dónde me conviene, con costo total real?"
2. **Trackear**: "mi plata está repartida en 4 apps — ¿cuánto tengo, cuánto rinde, dónde está mal ubicada?"
3. **Mirar a otros**: "¿cómo lo resuelve gente como yo?"

El moat NO está en los datos (commodity público) — está en **personalización + histórico propio + comunidad**.

## 4. Dominio propuesto

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOMINIO COMPARADOR                       │
│                                                                 │
│  Provider ────< AssetListing        (qué ofrece cada app)       │
│     │                                                           │
│     ├──────< YieldRate              (APY por moneda, HISTÓRICO) │
│     └──────< FeeSchedule            (comisiones/spreads;        │
│                                      curado manual p/ brokers)  │
│                                                                 │
│  ComparisonEngine                                               │
│    input:  monto, objetivo, moneda                              │
│    output: ranking por costo total + rendimiento neto,          │
│            con desglose transparente ("mostramos la cuenta")    │
└─────────────────────────────────────────────────────────────────┘
            │ consume                        │ consume
            ▼                                ▼
┌───────────────────────┐        ┌───────────────────────────┐
│  prices/ (EXISTENTE)  │        │  portfolio/ (EXISTENTE)   │
│  Finnhub + CoinGecko  │        │  holdings del usuario     │
└───────────────────────┘        │  visibility → Phase C     │
                                 └───────────────────────────┘

Módulos del clon (wallet, transaction, card, investment, kyc,
beneficiaries): CONGELADOS como showcase. No invertir más ahí.
```

## 5. Estrategia de datos

| Fuente | Datos | Modo | Frecuencia |
|---|---|---|---|
| ArgentinaDatos | APYs por entidad | Sync job → **snapshot propio en DB** | Cada 6-12 h |
| CriptoYa | Precios/spreads USDT/cripto por app | On-demand + cache Redis (patrón ya montado en `prices/`) | 1-5 min TTL |
| Curación manual | Comisiones brokers (IOL, Balanz, PPI, Cocos...) | Admin/seed con `lastVerifiedAt` VISIBLE | Semanal/mensual |

**Decisión clave**: guardar histórico propio desde el día 1. Las APIs dan el presente; el histórico acumulado es un activo que nadie te puede copiar y habilita "rendimiento de tu cartera si hubiera estado en X".

Riesgo: dependencia de APIs de terceros → mitigación: patrón adapter (un módulo por fuente), snapshots propios, degradación graceful (ya practicada en `prices/`).

## 6. Corte de MVP — Phase B

**In:**
- Registry de providers (5-8: Belo, Lemon, Ripio, Fiwind, Buenbit, Cocos, Prex...)
- Sync ArgentinaDatos + histórico propio de APYs
- Integración CriptoYa para spreads de compra USDT por app
- ComparisonEngine v1: "tengo X en ARS/USDT" → ranking rendimiento/costo, reglas simples y transparentes
- UI: pantalla comparador + ficha de provider (el frontend ya consume la API real)

**Out (explícitamente):**
- Social (Phase C — el modelo ya tiene `visibility` como gancho)
- Comisiones de brokers CEDEARs/acciones (Phase B.2 — requiere proceso de curación)
- Mobile, alertas, multi-país (Brasil después de validar AR)

## 7. Preguntas abiertas

1. **Naming/marca**: "payflow" describe al clon, no al comparador. ¿Se renombra el producto público?
2. **Frontend**: ¿el comparador es una sección nueva del dashboard actual o se reorganiza la navegación alrededor de él (comparar / mi cartera / comunidad)?
3. **Términos de uso de CriptoYa API**: verificar atribución requerida antes de producción.
4. **Qué hacer con las pantallas del clon** (wallet, cards, enviar/depositar) en el producto público: ¿se ocultan, quedan como demo, o se archivan?
5. **Monetización objetivo**: afiliados/referidos (validado en el nicho) — ¿desde el MVP o después de tracción?

## 8. Próximo paso — DECIDIDO (2026-07-14)

**Compromiso**: antes de cualquier parte de la visión grande, se shippea el **wedge CEDEARs**:

> Página pública, gratis, sin registro: "¿cuánto te cuesta DE VERDAD invertir $X en CEDEARs en cada broker?" — comisiones + derechos de mercado + custodia, datos curados a mano, `lastVerifiedAt` visible.

- Es el único hueco del research SIN herramienta existente (solo blogs desactualizados).
- Se valida en comunidades (r/merval, Twitter finanzas AR) — usuarios antes que features.
- **Regla acordada**: no se toca NADA más del roadmap (tracker, histórico, social, comparison-engine) hasta que el wedge esté en producción.
- El change `comparison-engine-mvp` queda en pausa; el primer change nuevo será el del wedge (proposal en la próxima sesión).

Contexto personal que motiva el corte chico: el objetivo es un producto con usuarios reales del que Emi pueda vivir — shippear y validar rápido pesa más que la arquitectura ambiciosa.
