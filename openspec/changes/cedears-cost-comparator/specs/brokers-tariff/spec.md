# Spec: Brokers Tariff

## R1 — Tarifario público

### Scenario: Listado sin autenticación
- GIVEN un request SIN cookie de sesión ni JWT
- WHEN GET /brokers
- THEN el sistema MUST responder 200 con `{ meta, brokers }`
- AND `brokers` MUST incluir solo brokers con `isActive: true`
- AND MUST ordenarse por comisión de compra ascendente

### Scenario: Meta de mercado incluida
- GIVEN cualquier request a GET /brokers
- THEN `meta` MUST incluir `marketRightsPct` (derechos de mercado BYMA), `ivaPct`, y la fuente con fecha de vigencia

## R2 — Transparencia de datos

### Scenario: Fuentes y verificación por broker
- GIVEN un broker en la respuesta
- THEN MUST incluir `sources` (array de `{ label, url }`) y `lastVerifiedAt`
- AND MUST incluir las notas (`feeNotes`, `custodyNotes`, `subscriptionNotes`) cuando existan

### Scenario: Broker con modelo de suscripción
- GIVEN un broker con comisión 0% y suscripción mensual (ej: IEB+)
- THEN la respuesta MUST incluir `subscriptionMonthlyArs` y `subscriptionNotes`
- AND `feeBuyPct`/`feeSellPct` MUST ser 0

## R3 — El resto de la API sigue protegida

### Scenario: Endpoint público no debilita al resto
- GIVEN un request sin autenticación
- WHEN GET /portfolio (o cualquier endpoint protegido)
- THEN el sistema MUST rechazar el acceso (403 si no hay cookie CSRF — el CsrfGuard global corre primero —, 401 con CSRF válido pero sin JWT)
