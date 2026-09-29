# Spec: Template Literal Types

## Requirements

### 2a. KYC shared types
- Extract `DocumentType = "DNI" | "PASSPORT" | "DRIVER_LICENSE"` to shared file
- Extract `KycReviewAction = "approve" | "reject"` to shared file
- Import in both DTOs that use them

### 2b. AuthorizationTokenEnum string enum
- Convert from numeric (implicit 0-5) to explicit string values
- Each value matches the key name in snake_case (e.g., `CONFIRM_EMAIL = "confirm_email"`)
- Cache keys change but repopulate on deploy

### 2c. two-factor-pending literal
- Change `payload: { sub: string; type: string }` to `payload: { sub: string; type: "2fa_pending" }`
- Remove the runtime `if` check (becomes compile-time enforced)

## Scenarios

- After string enum conversion, `getKey({ type: AuthorizationTokenEnum.CONFIRM_EMAIL, userId: "u1" })` returns `"tokenconfirm_email:user:u1"`
- `two-factor-pending.strategy.ts` validate function cannot be called with `type: "anything_else"`
