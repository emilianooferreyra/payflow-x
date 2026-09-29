## ADDED Requirements

### Requirement: Version-gated refresh token rotation

The system SHALL track a `refreshTokenVersion` counter per session, incremented on each successful token rotation. The version SHALL be included in the refresh token JWT payload. On refresh, the version from the JWT MUST match the version stored in the database.

#### Scenario: Normal rotation increments version
- **WHEN** a client sends a valid refresh token
- **AND** the version in the JWT matches the database version
- **THEN** the system issues new tokens
- **AND** increments `refreshTokenVersion` by 1
- **AND** updates the stored refresh token hash

#### Scenario: Stale token triggers theft detection
- **WHEN** a client sends a refresh token whose JWT is valid
- **AND** the JWT version does NOT match the database version
- **AND** the current time is greater than the session's `updatedAt` timestamp plus the 2-second grace period
- **THEN** the system SHALL delete the session
- **AND** clear auth cookies
- **AND** throw UnauthorizedException

#### Scenario: Concurrent refresh request falls within grace period
- **WHEN** a client sends a refresh token whose JWT is valid
- **AND** the JWT version does NOT match the database version
- **AND** the difference between current time and the session's `updatedAt` timestamp is LESS OR EQUAL to 2000ms
- **THEN** the system SHALL NOT delete the session
- **AND** SHALL NOT clear auth cookies
- **AND** SHALL throw UnauthorizedException (generic 401 to force client retry/sync)

### Requirement: Session initialization sets version to 0

When a new session is created, `refreshTokenVersion` SHALL default to 0.

#### Scenario: New session has version 0
- **WHEN** a new session is created during login, register, or OAuth
- **THEN** the session SHALL have `refreshTokenVersion` = 0
- **AND** the initial refresh token JWT SHALL contain `version: 0`

### Requirement: Security event on detected theft

When theft is detected (version mismatch), the system SHOULD log a security warning with session ID and user ID.

#### Scenario: Theft event is logged
- **WHEN** a refresh token is rejected and session is deleted due to version mismatch outside the grace period
- **THEN** the system SHALL log a warning with the session ID and user ID
