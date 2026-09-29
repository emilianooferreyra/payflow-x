## Context

PayFlow backend es un monorepo NestJS 11 con Prisma 7 + PostgreSQL + Redis. Actualmente no existe infraestructura de testing más allá de Jest configurado y un test e2e aislado para HashService. Los servicios llaman a `this.prisma.model.*` directamente sin capa de repositorio, lo que hace que el unit testing requiera mockear Prisma.

El código tiene inconsistencias: directorio `src/commom/` mal escrito coexistiendo con `src/common/`, varios módulos sin DTOs, y `res: any` en controllers.

## Goals / Non-Goals

**Goals:**
- Proveer helpers reutilizables de testing (Prisma mock, módulo de testing, factories)
- Escribir tests unitarios para los 4 servicios core: HashService, PrismaService, SessionService, UsersService
- Corregir el typo `commom/` → `common/`
- Agregar DTOs con `class-validator` a users, card y exchange-rate
- Tipar `res` como `Response` de Express en todos los controllers

**Non-Goals:**
- Tests de integración o e2e completos (se deja para cambios futuros)
- Tests para guards, strategies, decorators o controllers
- Refactorizar la capa de acceso a datos (agregar repositorios)
- Cambiar la lógica de negocio existente

## Decisions

| Decisión | Opción elegida | Alternativa | Razón |
|----------|---------------|-------------|-------|
| Mock de Prisma | `createMock()` manual + `TestingModule` | `prisma-mock` librería externa | Sin dependencias extra, control total sobre los mocks |
| Test DB | SQLite en memoria via `$transaction` mock | Base PostgreSQL separada | Tests unitarios no deben depender de DB real |
| Factories | Functions simples (`makeUser()`) | Faker.js | Mínima complejidad, datos predecibles |
| Rename `commom/` | Mover directorio + actualizar imports | Dejar alias | Consistencia a largo plazo, se hace ahora que el proyecto es chico |

## Risks / Trade-offs

- [Riesgo] Mocks de Prisma frágiles si el schema cambia → Mitigación: tipar los mocks contra el PrismaClient generado
- [Riesgo] El rename de `commom/` rompe imports activos → Mitigación: verificar con `rg "from.*commom"` y `tsc --noEmit` post-cambio
- [Trade-off] Tests sin repositorio requieren mockear Prisma directo, más verboso pero funcional para el tamaño actual del proyecto
