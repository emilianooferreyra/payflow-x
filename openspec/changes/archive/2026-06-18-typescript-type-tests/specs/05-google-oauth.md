# Spec: Google OAuth types

## Requirements

- Define `GoogleProfile` interface matching Passport Google profile structure
- Define `GoogleUser` interface for the validated return value
- Replace `profile: any` with `profile: GoogleProfile` in strategy
- Replace `googleUser: any` with `googleUser: GoogleUser` in auth service
- Use `satisfies GoogleUser` on the return value for exhaustiveness

## GoogleProfile shape

```typescript
interface GoogleProfile {
  id: string;
  name: { givenName: string; familyName: string };
  emails: Array<{ value: string }>;
  photos: Array<{ value: string }>;
}
```

## GoogleUser shape

```typescript
interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  lastName: string;
  avatar?: string;
}
```

## Scenarios

- `validate()` return value is assignable to `GoogleUser`
- Adding a new field to the return without adding it to `GoogleUser` causes a compile error with `satisfies`
