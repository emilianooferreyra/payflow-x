# Webhook Specification

## Purpose

Notify external partners when domain events occur by delivering signed payloads to registered endpoints with retry on failure.

## Requirements

### Requirement: Register endpoint

A partner MUST be able to register a webhook endpoint by providing a URL.

- GIVEN an unauthenticated request with a valid URL
- WHEN POST /api/webhooks/endpoints is called
- THEN a new endpoint is created with a generated secret
- AND the response contains the endpoint ID and secret

### Requirement: Sign payload with HMAC

The system MUST sign every webhook payload with HMAC-SHA256 using the endpoint's secret. The signature MUST be sent in the `X-Webhook-Signature` header.

- GIVEN a registered endpoint with a secret
- WHEN a webhook is dispatched
- THEN the payload body is signed with HMAC-SHA256
- AND the `X-Webhook-Signature` header contains the hex-encoded signature

### Requirement: Dispatch on deposit

The system MUST dispatch a `deposit.confirmed` event after a wallet deposit is completed.

- GIVEN a successful deposit
- WHEN the deposit transaction is committed
- THEN a webhook is dispatched to all registered endpoints with event type `deposit.confirmed`
- AND the payload includes the deposit amount, currency, and wallet ID

### Requirement: Dispatch on withdrawal

The system MUST dispatch a `withdraw.completed` event after a withdrawal is completed.

- GIVEN a successful withdrawal
- WHEN the withdrawal transaction is committed
- THEN a webhook is dispatched to all registered endpoints with event type `withdraw.completed`
- AND the payload includes the withdrawal amount, currency, and wallet ID

### Requirement: Retry on failure

If an endpoint returns a non-2xx status or the request fails, the system MUST retry with exponential backoff: 1 minute, 5 minutes, 15 minutes. After 3 failed attempts, the delivery SHALL be marked as `failed`.

- GIVEN an endpoint that returns 500
- WHEN a webhook is dispatched
- THEN the system retries after 1 minute
- AND after 5 minutes if still failing
- AND after 15 minutes if still failing
- THEN the delivery is marked as `failed`
- AND no more retries are attempted

### Requirement: List deliveries

A partner SHOULD be able to list delivery history for an endpoint.

- GIVEN a registered endpoint with past deliveries
- WHEN GET /api/webhooks/endpoints/:id/deliveries is called
- THEN the response contains a paginated list of deliveries with status, attempt count, and response status code
