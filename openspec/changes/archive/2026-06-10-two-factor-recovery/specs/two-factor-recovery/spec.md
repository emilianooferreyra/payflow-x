# Delta for Auth / Two-Factor

## ADDED Requirements

### Requirement: Backup codes on 2FA enable

Enabling 2FA SHALL generate 10 single-use backup codes. Codes SHALL be stored as argon2 hashes. The system SHALL return the codes in plain text exactly once.

#### Scenario: Backup codes returned on enable

- GIVEN a user calls `POST /auth/2fa/enable` with a valid code
- WHEN 2FA is enabled
- THEN the response SHALL include 10 backup codes
- AND each code SHALL be 8 alphanumeric characters

#### Scenario: Backup code used for login

- GIVEN a user who lost TOTP access
- WHEN they call `POST /auth/2fa/verify` with a valid backup code
- THEN the system SHALL complete the login
- AND SHALL mark that backup code as used

#### Scenario: Backup code is single-use

- GIVEN a backup code has been used
- WHEN the same code is submitted again
- THEN the system SHALL reject it with `401 Unauthorized`

### Requirement: Rate limit 2FA verification

`POST /auth/2fa/verify` SHALL allow max 5 failed attempts per userId per 15-minute window.

#### Scenario: Blocked after 5 failures

- GIVEN a user has 5 failed 2FA attempts in 15 minutes
- WHEN a 6th attempt is made with any code
- THEN the system SHALL return `429 Too Many Requests`

#### Scenario: Rate limit resets after 15 minutes

- GIVEN a user was rate-limited 15 minutes ago
- WHEN they submit a valid code
- THEN the system SHALL accept it and complete the login

### Requirement: Trusted device cookie

On successful 2FA verify, the system MAY set a `trusted_device` cookie (signed JWT, 30 days). If present and valid on subsequent login, the system SHALL skip 2FA.

#### Scenario: Trusted device skips 2FA

- GIVEN a user with `twoFactorEnabled`
- WHEN they login with a valid `trusted_device` cookie
- THEN the system SHALL complete the login without requesting 2FA

### Requirement: Re-generate backup codes

`POST /auth/2fa/codes/regenerate` SHALL invalidate all existing backup codes and generate 10 new ones.

#### Scenario: Regenerate invalidates old codes

- GIVEN a user has 3 remaining backup codes
- WHEN they regenerate codes
- THEN old codes SHALL be invalidated
- AND 10 new codes SHALL be returned
