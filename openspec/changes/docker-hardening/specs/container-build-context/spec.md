## ADDED Requirements

### Requirement: Build context excludes local artifacts and secrets

The `.dockerignore` file SHALL list each pattern on its own line and MUST exclude `.pnpm-store`, `.env` and every `.env.*` file except `.env.template`, `.github/`, and `**/.DS_Store`.

#### Scenario: Every ignore entry is a standalone line
- **WHEN** `.dockerignore` is parsed line by line
- **THEN** no line SHALL contain two concatenated patterns
- **AND** `.pnpm-store` SHALL appear as its own entry

#### Scenario: Secret files never reach the build context
- **GIVEN** a developer has `.env` and `.env.local` in the project root
- **WHEN** the image is built
- **THEN** neither file SHALL be part of the build context

### Requirement: Compose dependency images match CI

`docker-compose.yml` and `.github/workflows/ci.yml` SHALL use the same major-version tags for PostgreSQL and Redis (`postgres:16`, `redis:7`).

#### Scenario: No version drift between local and CI
- **WHEN** the image tags for `postgres` and `redis` are compared across both files
- **THEN** they SHALL be identical

### Requirement: App waits for a healthy Redis

The `auth-redis` service SHALL define a healthcheck, and the `app` service SHALL depend on it with `condition: service_healthy`.

#### Scenario: App does not start before Redis answers
- **WHEN** `docker compose up` starts the stack
- **THEN** the `app` container SHALL NOT start until `auth-redis` reports healthy
