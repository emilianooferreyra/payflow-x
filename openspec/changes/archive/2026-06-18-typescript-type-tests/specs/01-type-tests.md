# Spec: Type tests for utility types

## Requirements

- Define `AssertEqual<T, U>` that evaluates to `true` when types are exactly equal
- Verify `assertFound<T>()` narrows correctly
- Verify `isCurrencyEnum()` narrows correctly (if branch = CurrencyEnum, else = string)
- Verify `WebhookEvent` accepts all 3 variants and rejects invalid ones
- Verify `UpdateUserInterface` has `id: string` required, `password?: string` optional

## Scenarios

- `AssertEqual<string, string>` → `true`
- `AssertEqual<string | number, string>` → `false`
- After `assertFound(value, "test")`, `value` narrows from `string | null` to `string`
- After `if (isCurrencyEnum(x))`, `x` is `CurrencyEnum`; else `x` is `string`
- `WebhookEvent` rejects `{ type: "transfer.cancelled"; data: {} }`
- `UpdateUserInterface` satisfies `{ id: string; name?: string; password?: string }`

## Technical notes

`AssertEqual` uses `[T] extends [U]` (tuple-wrapped) to avoid distributivity over unions.
Tests live in `src/__type-tests__/index.ts`. Test runner: `npx tsc --noEmit`.
