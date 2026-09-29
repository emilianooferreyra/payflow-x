## ADDED Requirements

### Requirement: WebhookService dispatch with endpoints
The system SHALL dispatch events to all active webhook endpoints for a user, signing each payload with HMAC-SHA256.

#### Scenario: Dispatch to multiple endpoints
- **WHEN** `dispatch("user-1", { type: "deposit", data: {} })` is called with active endpoints
- **THEN** it SHALL fetch endpoints via `prisma.webhookEndpoint.findMany`
- **THEN** each endpoint SHALL receive a signed POST request via `HttpService.post`
- **THEN** a `webhookDelivery` record SHALL be created for each endpoint

#### Scenario: Skip dispatch when no endpoints
- **WHEN** `dispatch` is called and no active endpoints exist
- **THEN** no HTTP requests SHALL be made
- **THEN** no delivery records SHALL be created

#### Scenario: HMAC-SHA256 signature header
- **WHEN** dispatching to an endpoint with secret "test-secret"
- **THEN** the request SHALL include header `X-Signature` with HMAC-SHA256 of the JSON payload

### Requirement: WebhookService retry on failure
The system SHALL schedule retries for failed deliveries with exponential backoff.

#### Scenario: Mark delivery as pending on HTTP failure
- **WHEN** `HttpService.post` throws or returns non-2xx
- **THEN** the delivery record SHALL have status `PENDING_RETRY`
- **THEN** `retryAt` SHALL be set to a future timestamp

#### Scenario: Mark delivery as delivered on success
- **WHEN** `HttpService.post` returns 2xx
- **THEN** the delivery record SHALL have status `DELIVERED`
- **THEN** `deliveredAt` SHALL be set

### Requirement: WebhookService delivery record creation
The system SHALL record every delivery attempt with endpoint, event, status, and timestamps.

#### Scenario: Create delivery record
- **WHEN** a webhook is dispatched
- **THEN** `prisma.webhookDelivery.create` SHALL be called with `endpointId`, `event`, `status`, `payload`
