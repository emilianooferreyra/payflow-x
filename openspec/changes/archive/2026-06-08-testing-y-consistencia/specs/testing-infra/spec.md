## ADDED Requirements

### Requirement: Testing Module with Prisma mock
The system SHALL provide a `createTestingModule` helper that creates a NestJS `TestingModule` with a mocked PrismaService.

#### Scenario: Module is created with mocked Prisma
- **WHEN** calling `createTestingModule([UsersService])`
- **THEN** the module SHALL have UsersService available with a mocked PrismaService

### Requirement: Entity factories
The system SHALL provide factory functions to create test entities (User, Session, Wallet, etc.) with sensible defaults.

#### Scenario: Factory creates user with defaults
- **WHEN** calling `makeUser()`
- **THEN** the result SHALL be a valid User object with default values

#### Scenario: Factory creates user with overrides
- **WHEN** calling `makeUser({ email: "test@test.com" })`
- **THEN** the result SHALL have email "test@test.com" and default values for other fields

### Requirement: Mock Prisma client
The system SHALL provide a `mockPrisma` object that stubs all model operations (findUnique, findMany, create, update, delete) with jest.fn().

#### Scenario: Mock Prisma can stub findUnique
- **WHEN** calling `mockPrisma.user.findUnique.mockResolvedValue(user)`
- **THEN** `prismaService.user.findUnique()` SHALL resolve to the mocked user

### Requirement: Test location convention
Testing helpers SHALL live in `src/common/testing/`.

#### Scenario: Helpers are importable from common path
- **WHEN** importing from `src/common/testing`
- **THEN** the module SHALL export createTestingModule, mockPrisma, and factories
