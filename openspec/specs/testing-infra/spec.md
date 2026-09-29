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

### Requirement: Auth e2e — register
The system SHALL have an e2e test that registers a new user via `POST /auth/register`.

#### Scenario: Successful registration
- **WHEN** sending a POST to `/auth/register` with valid email, password, name
- **THEN** the response SHALL have status 201 and set `access_token` and `refresh_token` cookies

### Requirement: Auth e2e — login
The system SHALL have an e2e test that logs in with existing credentials via `POST /auth/login`.

#### Scenario: Successful login
- **WHEN** sending a POST to `/auth/login` with valid email and password
- **THEN** the response SHALL have status 200 and set `access_token` and `refresh_token` cookies

### Requirement: Auth e2e — refresh
The system SHALL have an e2e test that refreshes tokens via `POST /auth/refresh`.

#### Scenario: Successful token refresh
- **WHEN** sending a POST to `/auth/refresh` with a valid refresh_token cookie
- **THEN** the response SHALL have status 200 and set new `access_token` and `refresh_token` cookies

### Requirement: Auth e2e — logout
The system SHALL have an e2e test that logs out via `POST /auth/logout`.

#### Scenario: Successful logout
- **WHEN** sending a POST to `/auth/logout` with a valid session
- **THEN** the response SHALL clear the `access_token` and `refresh_token` cookies
