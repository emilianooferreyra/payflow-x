# Spec: isCurrencyEnum + satisfies

## Given
`validateCurrencyPrecision` receives `currency: string` and needs to pass it to `getDecimalPlaces` which expects `CurrencyEnum`.

`CURRENCY_DECIMALS` is typed as `Record<CurrencyEnum, number>` and needs to guarantee all enum keys are covered.

## When
- `isCurrencyEnum(value: string): value is CurrencyEnum` is called

## Then
- Returns `true` if `value` is a valid `CurrencyEnum` member
- Returns `false` otherwise
- After returning `true`, TypeScript narrows the type from `string` to `CurrencyEnum`
- The `as any` cast in `validateCurrencyPrecision` is replaced with a proper guard

## When
- `CURRENCY_DECIMALS` uses `satisfies Record<CurrencyEnum, number>`

## Then
- TypeScript checks that every `CurrencyEnum` key exists
- The literal type of keys is preserved (not widened to `string`)
- No `as any` or explicit type annotation needed
