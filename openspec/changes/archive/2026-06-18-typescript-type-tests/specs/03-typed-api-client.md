# Spec: Typed API Client

## Requirements

- Define `ExchangeRateApiResponse` interface matching the exchangerate-api.com v6 response
- Type the `res.json()` call so `data.conversion_rates.ARS` is typed as `number`

## Scenarios

- `data.conversion_rates.ARS` is `number`
- `data.conversion_rates["USD"]` is `number`
- Accessing `data.invalid_field` causes a compile error

## Technical notes

The API response has `conversion_rates` as a record with `[key: string]: number` index signature for flexibility.
Only the interface changes — runtime behavior is identical.
