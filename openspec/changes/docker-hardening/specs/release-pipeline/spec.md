## ADDED Requirements

### Requirement: Image publish requires green CI

The production image SHALL only be built and pushed after typecheck, unit tests and e2e tests have passed for the same commit.

#### Scenario: Failing tests block the publish
- **GIVEN** a push to `main` whose e2e suite fails
- **WHEN** the workflow runs
- **THEN** the publish job SHALL NOT run
- **AND** no image SHALL be pushed to the registry

#### Scenario: Pull requests never publish
- **WHEN** the workflow runs for a `pull_request` event
- **THEN** the publish job SHALL be skipped

### Requirement: Images are immutable-addressable

Each published image SHALL carry a `sha-<short commit>` tag in addition to `latest`.

#### Scenario: A specific version can be rolled back to
- **GIVEN** two consecutive successful publishes
- **WHEN** the registry tags are listed
- **THEN** each publish SHALL have its own `sha-<short>` tag
- **AND** `latest` SHALL point to the most recent one
