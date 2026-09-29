## Context

Actualmente tenemos infraestructura de testing (mocks, factories, helpers) y 4 suites de tests core. Los módulos financieros (Wallet, Transaction, Investment) y auth siguen sin cobertura. Los servicios utilitarios (Tokens, Emails) tienen catch blocks que tragan errores con mensajes genéricos.

## Goals / Non-Goals

**Goals:**
- Auth e2e test con supertest cubriendo register → login → refresh → logout
- Unit tests para WalletService (deposit, withdraw, transfer)
- Unit tests para TransactionService (create, paginate, filter)
- Unit tests para InvestmentService (buy, sell, portfolio)
- Errores específicos con contexto en TokensService y EmailsService

**Non-Goals:**
- E2e tests para wallets, transactions o investments (scope separado)
- Tests para card, kyc, exchange-rate (menor prioridad)
- Refactor de la arquitectura de auth o los servicios financieros

## Decisions

| Decisión | Opción | Alternativa | Razón |
|----------|--------|-------------|-------|
| Auth e2e approach | Supertest con agente persistente de cookies | Mocks de auth | Probar el flujo real de cookies HttpOnly |
| Test DB para e2e | Misma infraestructura mock que unit tests (mockPrisma) | Base PostgreSQL separada | Consistencia con el approach existente, sin setup adicional |
| Error handling | `BadRequestException` con mensaje contextual + `Logger.warn` | Loggear y relanzar original | Mantener consistencia con el patrón existente del proyecto |

## Risks / Trade-offs

- [Risk] Auth e2e con mock de Prisma no prueba la integración real con DB → Acceptado para este change, los e2e reales con DB son un change separado
- [Risk] Errores más detallados podrían exponer información interna → Mitigación: solo incluir token type y operation name, NO valores sensibles
