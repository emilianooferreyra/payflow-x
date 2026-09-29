# Spec: CurrentUser<T> generic

## Given
The `CurrentUser` decorator is used in 10+ controllers to extract the authenticated user from the request.

## When
The decorator is updated to `CurrentUser<T = UserPayload>` where `UserPayload` is a concrete type:

```ts
interface UserPayload {
  userId: string
  email?: string
  // ... other fields set by JwtStrategy.validate()
}
```

## Then
- `@CurrentUser() user` infers as `UserPayload` instead of `unknown`
- `@CurrentUser('userId') userId` infers as `string` (the type of `UserPayload['userId']`)
- No more `user: any` or `user: { userId: string }` annotations in controllers
- The decorator is generic but backwards-compatible: `@CurrentUser()` without explicit type param defaults to `UserPayload`

## Contract
```ts
createParamDecorator(<T = UserPayload>(data: keyof T, ctx: ExecutionContext): T[keyof T] | T => {
  const request = ctx.switchToHttp().getRequest()
  return data ? request.user?.[data] : request.user
})
```
