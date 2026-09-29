# Spec: WebhookEvent discriminated union

## Given
`WebhookEvent` is currently:

```ts
interface WebhookEvent {
  type: "deposit.confirmed" | "withdraw.completed" | "transfer.completed"
  data: Record<string, unknown>
}
```

`data: Record<string, unknown>` erases all type information — each event type has a different data shape but TypeScript doesn't know it.

## When
`WebhookEvent` becomes a discriminated union:

```ts
type WebhookEvent =
  | { type: "deposit.confirmed"; data: { walletId: string; userId: string; amount: string; currency: string; transactionId: string } }
  | { type: "withdraw.completed"; data: { walletId: string; userId: string; amount: string; currency: string; transactionId: string } }
  | { type: "transfer.completed"; data: { walletId: string; userId: string; amount: string; currency: string; transactionId: string } }
```

## Then
- Inside `dispatch(event: WebhookEvent)`, switching on `event.type` narrows `event.data` to the specific shape
- The three callers in `deposit.service.ts`, `withdraw.service.ts`, and `send.service.ts` get compile-time validation that they pass the correct `data` for their event `type`
- Adding a new event type requires defining its data shape — no more `Record<string, unknown>` opacity
