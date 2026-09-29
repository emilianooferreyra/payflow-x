## Why

El core financiero de PayFlow (auth, wallets, transactions, investments) y los servicios utilitarios (tokens, emails) no tienen tests ni manejo de errores robusto. Auth no tiene un solo test e2e que cubra el flujo crítico register→login→refresh→logout. Los servicios de Wallet, Transaction e Investment —el corazón del negocio— están sin cobertura. Y TokensService/EmailsService tragan errores con mensajes genéricos que complican el debugging.

## What Changes

1. **Auth e2e tests**: Flujo completo de autenticación usando supertest con base de datos de prueba.
2. **Unit tests para WalletService**: Cobertura de deposit, withdraw, transfer, getBalance.
3. **Unit tests para TransactionService**: Cobertura de creación, paginación, filtrado por tipo/estado.
4. **Unit tests para InvestmentService**: Cobertura de buy, sell, getPortfolio.
5. **Error handling en TokensService**: Reemplazar catch genérico por errores específicos con contexto.
6. **Error handling en EmailsService**: Reemplazar catch genérico por errores específicos con contexto.

## Capabilities

### New Capabilities
- `auth-e2e-tests`: Tests de integración para el flujo completo de autenticación
- `financial-unit-tests`: Tests unitarios para Wallet, Transaction e Investment services
- `utility-error-handling`: Manejo de errores con contexto en TokensService y EmailsService

### Modified Capabilities
- *(none — testing-infra y core-unit-tests specs existen pero este change no modifica requirements, solo expande)*

## Impact

- **auth-e2e**: Nuevo archivo `test/auth.e2e-spec.ts`. Requiere base de datos de prueba o mock de Prisma en e2e.
- **financial-unit-tests**: Nuevos `.spec.ts` en cada módulo. Usan la infraestructura de testing creada en `testing-y-consistencia`.
- **error-handling**: Modifica `tokens.service.ts` y `emails.service.ts` — cambios localizados, sin impacto en APIs públicas.
