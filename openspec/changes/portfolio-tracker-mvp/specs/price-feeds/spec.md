# Spec: Price Feeds

## R1 — Precio de símbolo único

El sistema DEBE retornar el precio actual para un símbolo dado.

### Scenario: Stock price
- GIVEN símbolo válido "AAPL"
- WHEN GET /prices/AAPL
- THEN respuesta MUST contener `symbol`, `price` (number), `source` ("FINNHUB"), `currency` ("USD"), `timestamp`

### Scenario: Crypto price
- GIVEN símbolo válido "BTC"
- WHEN GET /prices/BTC
- THEN respuesta MUST contener `source` ("COINGECKO")

### Scenario: Símbolo inválido
- GIVEN símbolo inexistente
- WHEN GET /prices/NONEXISTENT
- THEN sistema MUST retornar error (null price o 404)

## R2 — Batch de precios

El sistema MUST aceptar múltiples símbolos y retornar array de resultados.

### Scenario: Batch request
- GIVEN símbolos "AAPL,BTC,ETH"
- WHEN GET /prices?symbols=AAPL,BTC,ETH
- THEN respuesta MUST ser array de 3 objetos con `symbol`, `price`, `source`, `currency`, `timestamp`
- AND símbolos con error MUST aparecer con `price: null` sin romper el array

## R3 — Cache Redis

El sistema MUST cachear precios 5 minutos para evitar rate limits externos.

### Scenario: Cache hit
- GIVEN "AAPL" fue fetched hace menos de 5 min
- WHEN GET /prices/AAPL
- THEN sistema MUST retornar precio cacheado SIN llamar a la API externa (Finnhub)

### Scenario: Cache miss
- GIVEN "AAPL" no está en cache
- WHEN GET /prices/AAPL
- THEN sistema MUST llamar Finnhub y cachear el resultado

### Scenario: Redis caído
- GIVEN Redis no disponible
- WHEN GET /prices/AAPL
- THEN sistema MUST hacer fetch directo a API externa y retornar precio (sin cachear)

## R4 — Auth requerida

### Scenario: Sin JWT
- GIVEN request sin cookie access_token válida
- WHEN GET /prices/AAPL
- THEN sistema MUST retornar 401
