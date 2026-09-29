## ADDED Requirements

### Requirement: Liveness probe reports process health only

The system SHALL expose `GET /api/v1/health/live` which MUST NOT depend on the database, Redis or any other external service.

#### Scenario: Liveness stays green when dependencies are down
- **GIVEN** the database and Redis are unreachable
- **WHEN** a client calls `GET /api/v1/health/live`
- **THEN** the response status SHALL be 200
- **AND** neither the Prisma nor the Redis indicator SHALL be invoked

### Requirement: Readiness probe reports dependency health

The system SHALL expose `GET /api/v1/health/ready` which MUST check the database and Redis.

#### Scenario: Readiness is green when dependencies are up
- **GIVEN** the database and Redis are reachable
- **WHEN** a client calls `GET /api/v1/health/ready`
- **THEN** the response status SHALL be 200
- **AND** the body SHALL report `database` and `redis` as `up`

#### Scenario: Readiness fails when a dependency is down
- **GIVEN** Redis is unreachable
- **WHEN** a client calls `GET /api/v1/health/ready`
- **THEN** the response status SHALL be 503
- **AND** the body SHALL report `redis` as `down`

### Requirement: Legacy health path remains available

The system SHALL keep `GET /api/v1/health` returning the same result as `/health/ready` and SHOULD mark it deprecated in the Swagger document.

#### Scenario: Legacy path mirrors readiness
- **WHEN** a client calls `GET /api/v1/health`
- **THEN** the checks executed SHALL be identical to those of `/health/ready`

### Requirement: Container healthcheck uses liveness

The production image `HEALTHCHECK` SHALL target `/api/v1/health/live`.

#### Scenario: Dependency outage does not mark the container unhealthy
- **GIVEN** the API process is running and Redis is down
- **WHEN** Docker runs the image healthcheck
- **THEN** the container SHALL remain `healthy`
