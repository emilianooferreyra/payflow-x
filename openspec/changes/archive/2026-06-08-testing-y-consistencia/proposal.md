## Why

PayFlow tiene una base sólida pero carece de dos cosas fundamentales para un proyecto fintech: **tests** y **consistencia interna**. No hay un solo test unitario en 14 módulos, y hay inconsistencias estructurales (typo `commom/`, DTOs faltantes, `res: any`) que dificultan el mantenimiento y la escalabilidad. Abordar esto ahora — antes de agregar más features — evita que la deuda técnica crezca y sienta las bases para poder refactorizar con confianza.

## What Changes

1. **Infraestructura de testing**: Configurar test helpers, base de datos de prueba, factories y mocks para poder escribir tests unitarios y de integración de forma consistente.
2. **Primera tanda de tests unitarios**: Tests para los servicios core (HashService, PrismaService, SessionService, UsersService) que son la base del resto del sistema.
3. **Corregir typo `commom/`**: Renombrar `src/commom/` a `src/common/` (unificar con `src/common/filters/` que ya existe).
4. **DTOs faltantes**: Agregar DTOs con validación a los módulos `users`, `card` y `exchange-rate` que hoy usan tipos inline.
5. **Tipar `res` en controllers**: Reemplazar `res: any` por `Response` de Express en todos los controllers.

## Capabilities

### New Capabilities
- `testing-infra`: Helpers, factories, base de prueba y configuración compartida para tests unitarios y de integración
- `core-unit-tests`: Tests unitarios para servicios fundamentales (hash, session, users, prisma)
- `code-consistency`: Correcciones de consistencia (typo `commom/`, DTOs, tipos)

### Modified Capabilities
- *(none — no hay specs previas)*

## Impact

- **Testing**: Se agrega `src/common/testing/` con helpers reutilizables. Los tests existentes (`test/hash.e2e-spec.ts`) no se modifican, solo se expande cobertura.
- **`commom/`**: El rename es puramente cosmético pero rompe imports existentes. Se actualizarán todos los imports del código base.
- **DTOs**: Nuevos archivos en `users/dto/`, `card/dto/`, `exchange-rate/dto/` sin cambiar la lógica de negocio.
- **Tipos**: Solo cambios de tipo en firma de métodos, sin impacto en runtime.
