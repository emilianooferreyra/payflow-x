# Spec: Derive Update interfaces with Omit + Partial

## Given
`CreateUserInterface` and `UpdateUserInterface` in `users.interface.ts` duplicate nearly identical fields. Same for beneficiaries.

## When
`UpdateUserInterface` is derived from `CreateUserInterface`:

```ts
interface CreateUserInterface {
  email: string
  password: string
  name?: string
  lastName?: string
  // ... more fields
}

// Instead of copy-pasting all fields:
type UpdateUserInterface = Partial<Omit<CreateUserInterface, 'password'>>
```

## Then
- Adding a field to `CreateUserInterface` automatically includes it in the update type
- No manual synchronization needed
- The `password` field is excluded from updates (security)
- Same pattern applied to beneficiaries and any other duplicated pairs
