## ADDED Requirements

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
