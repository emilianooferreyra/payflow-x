# Delta: Wallet — deposit

## MODIFIED Requirements

### Requirement: Amount as String

The system previously accepted `amount` as `number` with `@IsNumber({ maxDecimalPlaces: 2 })`.

(Previously: `amount: number` — floating point, loses precision.)

#### Scenario: Decimal string accepted

- GIVEN a POST to `/wallet/deposit` with `{ "amount": "100.50", "currency": "USD" }`
- WHEN the controller validates the DTO
- THEN validation passes
- AND the service converts `"100.50"` via `new Decimal("100.50")`

#### Scenario: Invalid format rejected

- GIVEN a POST to `/wallet/deposit` with `{ "amount": "abc", "currency": "USD" }`
- WHEN the controller validates the DTO
- THEN validation fails with 400

#### Scenario: Negative amount rejected

- GIVEN a POST to `/wallet/deposit` with `{ "amount": "-50", "currency": "USD" }`
- WHEN the controller validates the DTO
- THEN validation fails with 400

## REMOVED Requirements

### `@IsNumber({ maxDecimalPlaces: 2 })`

(Reason: replaced by `@IsString` + `@Matches` for exact decimal precision.)
