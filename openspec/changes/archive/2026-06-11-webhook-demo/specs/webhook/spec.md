# Webhook Demo Specification

## Purpose

Script de prueba que demuestra el sistema de webhooks end-to-end: crear un endpoint, disparar eventos y verificar la entrega con webhook.site.

## Requirements

### Requirement: Create webhook.site inbox

The script SHALL create a webhook.site inbox via their API (`POST https://webhook.site/token`) to obtain a unique URL where events will arrive.

#### Scenario: Inbox created successfully

- GIVEN the script has access to webhook.site API
- WHEN the script requests a new inbox
- THEN the response SHALL include a UUID and a generated URL

#### Scenario: webhook.site API unavailable

- GIVEN webhook.site is unreachable
- WHEN the script tries to create an inbox
- THEN the script SHALL accept a pre-existing inbox URL as fallback via env var or argument

### Requirement: Register webhook endpoint in payflow

The script SHALL call `POST /api/v1/webhooks/endpoints` with the webhook.site URL and SHALL store the returned secret for HMAC verification.

#### Scenario: Endpoint registered

- GIVEN a webhook.site inbox URL
- WHEN the script calls create endpoint
- THEN the response SHALL include an id, url, and secret

### Requirement: Trigger deposit event

The script SHALL call `POST /api/v1/wallet/deposit` to trigger a `deposit.confirmed` event.

#### Scenario: Deposit triggers webhook

- GIVEN a registered webhook endpoint
- WHEN a deposit is completed
- THEN the system SHALL dispatch a `deposit.confirmed` event to the endpoint

### Requirement: Verify delivery status

The script SHALL poll `GET /api/v1/webhooks/endpoints/:id/deliveries` to confirm the webhook was delivered successfully.

#### Scenario: Delivery confirmed

- GIVEN a deposit was made
- WHEN the script checks deliveries
- THEN the delivery SHALL have status `delivered`

### Requirement: HMAC signature verification

The script SHALL verify that the webhook payload was signed with the endpoint secret using HMAC-SHA256.

#### Scenario: Signature header present

- GIVEN a webhook.site received the event
- WHEN the script inspects the request
- THEN the `X-Webhook-Signature` header SHALL match HMAC-SHA256(secret, payload)

### Requirement: Output results

The script SHALL display a summary of the test: endpoint URL, events sent, delivery status, and links to webhook.site.

#### Scenario: Results printed

- GIVEN the demo completed
- WHEN the script finishes
- THEN the console SHALL show the webhook.site inbox URL, delivery status, and HMAC signature
