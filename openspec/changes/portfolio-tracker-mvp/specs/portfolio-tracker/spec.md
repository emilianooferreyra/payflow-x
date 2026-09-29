# Spec: Portfolio Tracker

## R1 — Crear portfolio

### Scenario: Portfolio creado
- GIVEN usuario autenticado
- WHEN POST /portfolio con `{ name: "Mi Tech Portfolio", description?: "..." }`
- THEN respuesta MUST retornar portfolio creado con 201
- AND portfolio MUST estar asociado al usuario autenticado

## R2 — Listar portfolios del usuario

### Scenario: Lista paginada
- GIVEN usuario autenticado con 3 portfolios
- WHEN GET /portfolio?limit=20
- THEN respuesta MUST ser `{ data: [...], nextCursor: null }`
- AND MUST incluir solo portfolios del usuario autenticado

### Scenario: Paginación cursor
- GIVEN usuario con más portfolios que el limit
- WHEN GET /portfolio?limit=2
- THEN respuesta MUST incluir `nextCursor` no nulo
- AND GET /portfolio?limit=2&cursor=<nextCursor> MUST retornar los siguientes

## R3 — Detalle de portfolio

### Scenario: Portfolio con assets
- GIVEN portfolio con 3 assets
- WHEN GET /portfolio/:id
- THEN respuesta MUST incluir datos del portfolio y array de assets
- AND respuesta NO MUST incluir precios actuales (eso va en /valuation)

### Scenario: Portfolio no encontrado
- GIVEN id inexistente
- WHEN GET /portfolio/:id
- THEN sistema MUST retornar 404

### Scenario: Portfolio de otro usuario
- GIVEN portfolio perteneciente a otro usuario
- WHEN GET /portfolio/:id
- THEN sistema MUST retornar 403

## R4 — Actualizar portfolio

### Scenario: Owner actualiza
- GIVEN usuario es dueño del portfolio
- WHEN PUT /portfolio/:id con `{ name: "Nuevo nombre" }`
- THEN respuesta MUST retornar portfolio actualizado

### Scenario: No owner
- GIVEN usuario NO es dueño
- WHEN PUT /portfolio/:id
- THEN sistema MUST retornar 403

## R5 — Eliminar portfolio

### Scenario: Owner elimina
- GIVEN usuario es dueño
- WHEN DELETE /portfolio/:id
- THEN sistema MUST retornar 204
- AND todos los assets MUST eliminarse (cascade)

## R6 — Agregar asset

### Scenario: Asset agregado
- GIVEN usuario es dueño del portfolio
- WHEN POST /portfolio/:id/assets con `{ symbol: "AAPL", type: "STOCK", quantity: 10, avgBuyPrice: 150, currency: "USD" }`
- THEN respuesta MUST retornar asset creado con 201

### Scenario: Tipo CEDEAR
- GIVEN usuario agrega CEDEAR con type "CEDEAR"
- WHEN POST /portfolio/:id/assets
- THEN sistema MUST aceptar el tipo sin error

## R7 — Eliminar asset

### Scenario: Asset eliminado
- GIVEN asset pertenece al portfolio del usuario
- WHEN DELETE /portfolio/:id/assets/:assetId
- THEN sistema MUST retornar 204

## R8 — Valuación del portfolio

### Scenario: Valuación calculada
- GIVEN portfolio con assets AAPL (10 unidades) y BTC (0.5 unidades)
- WHEN GET /portfolio/:id/valuation
- THEN respuesta MUST contener:
  - `totalValueUSD`: suma de (precio_actual × cantidad) por asset
  - `assets`: array con `{ symbol, currentPrice, quantity, valueUSD, pnl, pnlPercent }`
- AND `pnl` MUST ser `(currentPrice - avgBuyPrice) × quantity`
- AND `pnlPercent` MUST ser `((currentPrice - avgBuyPrice) / avgBuyPrice) × 100`

### Scenario: Precio no disponible
- GIVEN un asset cuyo símbolo no retorna precio
- WHEN GET /portfolio/:id/valuation
- THEN ese asset MUST aparecer con `currentPrice: null`, `valueUSD: null`, `pnl: null`
- AND los demás assets MUST valuarse normalmente

## R9 — Auth requerida en todos los endpoints

### Scenario: Sin JWT
- GIVEN request sin access_token válido
- WHEN cualquier endpoint de /portfolio
- THEN sistema MUST retornar 401
