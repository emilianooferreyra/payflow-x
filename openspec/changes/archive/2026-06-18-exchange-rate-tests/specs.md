# ExchangeRateService — Unit Tests

## Requirements

1. **getCurrent()** — Devuelve todas las 6 pairs soportadas con `fromCurrency`, `toCurrency`, `rate`, `date`
2. **getCurrent() empty** — Devuelve `[]` si no hay rates en DB
3. **getRate() found** — Devuelve el rate de una pair específica con el último rate
4. **getRate() not found** — Lanza `NotFoundException` si la pair no existe en DB
5. **getHistory()** — Devuelve últimos 30 rates en orden ascendente
6. **getHistory() empty** — Lanza `NotFoundException` si no hay history
7. **refresh() no API key** — Retorna mensaje si `EXCHANGE_RATE_API_KEY` no está configurada
8. **refresh() success** — Fetch a exchangerate-api, crea 6 rates en DB, retorna resumen
9. **refresh() API error** — fetch falla (network error) → se propaga el error
10. **refresh() API non-200** — fetch responde con status no exitoso → error

## Scenarios

### getCurrent — returns all supported pairs
```
Given: 6 ExchangeRate records exist (one per SUPPORTED_PAIRS)
When:  getCurrent()
Then:  returns array of 6 objects with fromCurrency, toCurrency, rate, date
```

### getCurrent — filters null results
```
Given: only 3 of 6 pairs have records
When:  getCurrent()
Then:  returns 3 objects (nulls filtered out)
```

### getCurrent — empty database
```
Given: no ExchangeRate records exist
When:  getCurrent()
Then:  returns []
```

### getRate — returns latest for valid pair
```
Given: ExchangeRate record exists for USD/ARS with rate 1200
When:  getRate("USD", "ARS")
Then:  returns { fromCurrency: "USD", toCurrency: "ARS", rate: 1200, date: ... }
```

### getRate — pair not found
```
Given: no ExchangeRate record for USD/BRL
When:  getRate("USD", "BRL")
Then:  throws NotFoundException("Rate USD/BRL not available")
```

### getHistory — returns last 30 ascending
```
Given: 30 ExchangeRate records for USD/ARS across 30 days
When:  getHistory("USD", "ARS")
Then:  returns array of 30 objects sorted by date asc
```

### getHistory — empty history
```
Given: no ExchangeRate records for USD/BRL
When:  getHistory("USD", "BRL")
Then:  throws NotFoundException("No history for USD/BRL")
```

### refresh — API key not configured
```
Given: EXCHANGE_RATE_API_KEY is not set
When:  refresh()
Then:  returns { message: "EXCHANGE_RATE_API_KEY not configured" }
```

### refresh — successful fetch
```
Given: EXCHANGE_RATE_API_KEY = "test-key-123"
And:   fetch returns { conversion_rates: { ARS: 1200, BRL: 5.5 } }
When:  refresh()
Then:  fetch was called with https://v6.exchangerate-api.com/v6/test-key-123/latest/USD
And:   exchangeRate.createMany called with 6 pairs
And:   returns { message: "Rates refreshed", pairs: 6, date: ... }
```

### refresh — network error
```
Given: EXCHANGE_RATE_API_KEY = "test-key-123"
And:   fetch throws network error
When:  refresh()
Then:  error propagates (no try/catch in service)
```

### refresh — API non-200 response
```
Given: EXCHANGE_RATE_API_KEY = "test-key-123"
And:   fetch returns { ok: false, status: 429 }
When:  refresh()
Then:  error propagates (res.json() falla o retorna datos inesperados)
```
