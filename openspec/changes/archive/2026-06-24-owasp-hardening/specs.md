## ADDED Requirements

### Requirement: Double-submit cookie CSRF protection

The system SHALL protect all state-changing endpoints (`POST`, `PUT`, `DELETE`, `PATCH`) against Cross-Site Request Forgery using the double-submit cookie pattern. A cryptographically signed CSRF token SHALL be set as a secure, httpOnly cookie AND returned in the JSON body of a dedicated endpoint. The SPA SHALL read the token strictly from the response body (JSON) and send it as `X-CSRF-Token` header on mutations. The server SHALL verify that the header matches the encrypted cookie.

#### Scenario: SPA fetches CSRF token on load
- **WHEN** the SPA calls `GET /auth/csrf-token`
- **THEN** the server SHALL set a signed `csrf-token` cookie as httpOnly
- **AND** return `{ token: "<value>" }` in the response body
- **AND** the SPA SHALL store the token in JavaScript memory (not localStorage)

#### Scenario: Valid mutation request
- **WHEN** the SPA sends a `POST`/`PUT`/`DELETE`/`PATCH` request
- **AND** includes `X-CSRF-Token` header matching the signed cookie
- **THEN** the request SHALL proceed normally

#### Scenario: Missing or invalid CSRF token
- **WHEN** a request to a state-changing endpoint arrives
- **AND** the `X-CSRF-Token` header is missing or does not match the signed cookie
- **THEN** the server SHALL reject with `403 Forbidden`

#### Scenario: CSRF disabled for e2e tests
- **WHEN** `CSRF_ENABLED` is `false`
- **THEN** the CSRF guard SHALL skip validation for all routes

#### Scenario: Webhook routes excluded from CSRF
- **WHEN** a route handler is decorated with `@SkipCsrf()`
- **THEN** the CSRF guard SHALL skip validation for that route

### Requirement: Restrictive CSP for API-only backend

The system SHALL set a Content-Security-Policy header that blocks all asset loading, since the backend is a pure REST API and never serves HTML/scripts.

#### Scenario: CSP blocks all assets
- **WHEN** the server responds to any request
- **THEN** the response SHALL include `Content-Security-Policy: default-src 'none'`
- **AND** no scripts, styles, fonts, or frames SHALL be allowed
