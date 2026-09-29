# TypeScript Advanced Types — Codebase Audit & Upgrade

## Intent

Elevar el uso de TypeScript en el codebase de básico (C-) a avanzado (A), eliminando `any`, `as` casts innecesarios, y duplicación manual de tipos. Aplicar discriminated unions, assertion functions, type guards, `satisfies`, template literal types, y genéricos donde corresponda.

## Problem

El análisis reveló 6 problemas estructurales de tipos:

1. **`any` propagado** — `CurrentUser` decorator sin genéricos fuerza `user: any` en 10+ controladores
2. **Null checks manuales** — 15+ `if (!x) throw NotFoundException` repetidos en vez de `assertFound<T>()`
3. **`as any` en validación** — `validateCurrencyPrecision` castea `currency as any` en vez de usar type guard
4. **`Record<string, unknown>` mata type safety** — `WebhookEvent` debería ser discriminated union con payload tipado por evento
5. **Reconstrucción manual de envs** — `envs.ts` copia 15 campos uno por uno cuando `satisfies envType` basta
6. **Duplicación de interfaces** — `UpdateUserInterface` copia 28 campos de `CreateUserInterface` en vez de derivar con `Omit` + `Partial`

## Solution

6 cambios independientes pero ordenados por impacto:

| # | Cambio | Archivos afectados |
|---|--------|-------------------|
| 1 | `assertFound<T>()` assertion function | 15+ services |
| 2 | `isCurrencyEnum()` type guard + `satisfies` | `validate-currency-precision.ts`, `get-decimal-places.ts` |
| 3 | `CurrentUser<T>` genérico | `current-user.decorator.ts`, 10+ controllers |
| 4 | `satisfies envType` | `envs.ts` |
| 5 | `WebhookEvent` → discriminated union | `webhook.service.ts`, 3 callers |
| 6 | `Partial<Omit<>>` en interfaces duplicadas | `users.interface.ts`, `beneficiaries.interface.ts` |

### Out of Scope (Future Work)
- Template literal types (no hay caso de uso claro hoy)
- Generic repository pattern (requiere refactor más grande)
- Strict `noUncheckedIndexedAccess` (requiere cambios masivos)

## Rollback

Code-only. Cada cambio es independiente y reversible commit por commit.
