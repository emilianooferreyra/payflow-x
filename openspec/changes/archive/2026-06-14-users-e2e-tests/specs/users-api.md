# Users API E2E Specification

## Purpose

Verify the Users controller endpoints (`GET /users/me`, `PATCH /users/me`) behave correctly under authentication and validation rules.

## Requirements

### Requirement: GET /users/me returns profile for authenticated user

The system MUST return the authenticated user's profile including KYC status.

#### Scenario: Authenticated user gets profile
- GIVEN a user exists with a valid session and KYC verification
- WHEN a GET request is sent to `/api/v1/users/me` with the access_token cookie
- THEN the response MUST be 200
- AND the body MUST include `id`, `email`, `name`, `kyc.status`

#### Scenario: No auth cookie returns 401
- GIVEN no access_token cookie
- WHEN a GET request is sent to `/api/v1/users/me`
- THEN the response MUST be 401

### Requirement: PATCH /users/me updates user profile

The system MUST update user profile fields when valid data is provided.

#### Scenario: Update name successfully
- GIVEN a user exists with a valid session
- WHEN a PATCH request is sent to `/api/v1/users/me` with `{ name: "New Name" }` and a valid access_token cookie
- THEN the response MUST be 200
- AND the body MUST include `name` equal to `"New Name"`

#### Scenario: Invalid email returns 400
- GIVEN a user exists with a valid session
- WHEN a PATCH request is sent to `/api/v1/users/me` with `{ email: "invalid" }` and a valid access_token cookie
- THEN the response MUST be 400

#### Scenario: No auth cookie returns 401
- GIVEN no access_token cookie
- WHEN a PATCH request is sent to `/api/v1/users/me` with valid body data
- THEN the response MUST be 401

#### Scenario: Empty name returns 400
- GIVEN a user exists with a valid session
- WHEN a PATCH request is sent to `/api/v1/users/me` with `{ name: "" }` and a valid access_token cookie
- THEN the response MUST be 400
