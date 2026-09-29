## ADDED Requirements

### Requirement: SessionTokenService token generation
The system SHALL generate access and refresh JWT tokens signed with the configured secrets.

#### Scenario: Generate both tokens
- **WHEN** `generateTokens("user-1", "session-1")` is called
- **THEN** it SHALL return an object with `accessToken` and `refreshToken` as non-empty strings

#### Scenario: Access token uses default JWT config
- **WHEN** `generateTokens` is called
- **THEN** `jwtService.sign` SHALL be called with `{ sub: "user-1", sessionId: "session-1" }`

#### Scenario: Refresh token uses JWT_REFRESH_SECRET
- **WHEN** `generateTokens` is called
- **THEN** `jwtService.signAsync` SHALL be called with `{ sub: "user-1", sessionId: "session-1" }` and secret `JWT_REFRESH_SECRET`

### Requirement: SessionTokenService session creation
The system SHALL create a session, generate tokens, hash the refresh token, update the session, and set cookies.

#### Scenario: Create session with tokens
- **WHEN** `createSessionWithTokens("user-1", res)` is called
- **THEN** it SHALL call `sessionService.create` with userId and pending refresh token
- **THEN** it SHALL call `generateTokens`
- **THEN** it SHALL call `hashService.hash` with the refresh token
- **THEN** it SHALL call `sessionService.update` with the hashed token
- **THEN** it SHALL call `setTokenCookies` with both tokens

#### Scenario: Fail gracefully on session creation error
- **WHEN** `sessionService.create` throws an error
- **THEN** it SHALL throw `BadRequestException` with message "There was an error creating the session."

### Requirement: SessionTokenService cookie management
The system SHALL set and clear HttpOnly cookies for access and refresh tokens.

#### Scenario: Set auth cookies
- **WHEN** `setTokenCookies(res, "access", "refresh")` is called
- **THEN** `res.cookie` SHALL be called with "access_token" and "refresh_token"
- **THEN** both cookies SHALL have `httpOnly: true` and `sameSite: "lax"`

#### Scenario: Clear auth cookies
- **WHEN** `clearTokenCookies(res)` is called
- **THEN** `res.clearCookie` SHALL be called for "access_token" and "refresh_token"
