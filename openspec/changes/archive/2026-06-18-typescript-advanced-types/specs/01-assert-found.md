# Spec: assertFound<T>()

## Given
A service method queries a Prisma model and gets `T | null`:
```ts
const user = await this.prisma.user.findUnique({ where: { id } })
// typeof user === User | null
```

## When
`assertFound(user, 'User')` is called:

## Then
- If `user` is `null` or `undefined`, throws `NotFoundException` with message `"User not found"`
- The return type of the function is `asserts value is T` — TypeScript narrows `user` from `T | null` to `T` after the call
- No `if (!user) throw` guards needed after the assertion

## Examples

```ts
// Before:
const wallet = await tx.wallet.findUnique(...)
if (!wallet) throw new NotFoundException(`Wallet not found`)

// After:
const wallet = await tx.wallet.findUnique(...)
assertFound(wallet, `Wallet ${currency}`)
```
