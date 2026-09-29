## ADDED Requirements

### Requirement: HashService tests
The system SHALL have unit tests for HashService covering hash creation and verification.

#### Scenario: HashService hashes a password
- **WHEN** calling `hashService.hash("plainPassword")`
- **THEN** the result SHALL be a non-empty string different from the input

#### Scenario: HashService verifies correct password
- **WHEN** calling `hashService.verify(hashed, "plainPassword")` with the matching password
- **THEN** the result SHALL be true

#### Scenario: HashService rejects wrong password
- **WHEN** calling `hashService.verify(hashed, "wrongPassword")` with a non-matching password
- **THEN** the result SHALL be false

### Requirement: SessionService tests
The system SHALL have unit tests for SessionService covering session creation, refresh, and revocation.

#### Scenario: Create session creates a new session
- **WHEN** calling `sessionService.create(userId, refreshToken, data)`
- **THEN** a new session SHALL be created with isActive=true

#### Scenario: Rotate refresh token deactivates old session
- **WHEN** calling `sessionService.rotateRefreshToken(oldSessionId, newRefreshToken)`
- **THEN** the old session SHALL have isActive=false and a new session SHALL be created

### Requirement: UsersService tests
The system SHALL have unit tests for UsersService covering user creation and lookup.

#### Scenario: Create user
- **WHEN** calling `usersService.create({ email, password, name, country, language })`
- **THEN** a new user SHALL be created with status=DRAFT and authProvider=LOCAL

### Requirement: PrismaService tests
The system SHALL have unit tests ensuring PrismaService initializes and extends PrismaClient correctly.

#### Scenario: PrismaService extends PrismaClient
- **WHEN** inspecting PrismaService instance
- **THEN** it SHALL be an instance of PrismaClient
