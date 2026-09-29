## ADDED Requirements

### Requirement: Webhook demo script via webhook.site
The system SHALL provide a standalone Node.js script (`scripts/webhook-demo.ts`) that tests webhook delivery end-to-end using [webhook.site](https://webhook.site) as an external receiver.

#### Scenario: Create webhook.site inbox automatically
- **WHEN** the script starts without `WEBHOOK_SITE_TOKEN` env var
- **THEN** it SHALL POST `https://webhook.site/token` to create a new inbox
- **THEN** it SHALL extract the `uuid` from the response
- **THEN** it SHALL construct the URL as `https://webhook.site/{uuid}`

#### Scenario: Use pre-existing webhook.site token
- **WHEN** `WEBHOOK_SITE_TOKEN` env var is set
- **THEN** the script SHALL use `https://webhook.site/{WEBHOOK_SITE_TOKEN}` directly
- **THEN** it SHALL skip the `POST /token` API call

#### Scenario: Register webhook endpoint
- **WHEN** a webhook.site URL is available
- **THEN** the script SHALL POST to `/api/v1/webhooks/endpoints` to register the URL
- **THEN** it SHALL store the returned `id` and `secret`

#### Scenario: Trigger a deposit event
- **WHEN** an endpoint is registered
- **THEN** the script SHALL POST to `/api/v1/wallet/deposit` with `{ amount: 1000, currency: "USD" }`
- **THEN** it SHALL verify the response is 2xx

#### Scenario: Verify webhook delivery via polling
- **WHEN** a deposit is triggered
- **THEN** the script SHALL poll `GET https://webhook.site/token/{uuid}/request/latest` every 1 second (with 2x backoff, max 8s between retries)
- **THEN** it SHALL stop polling when a request is received
- **THEN** it SHALL extract the `X-Signature` header and payload from the received request

#### Scenario: Verify HMAC-SHA256 signature
- **WHEN** the webhook request is received
- **THEN** the script SHALL compute `HMAC-SHA256(payload, secret)` using the endpoint's secret
- **THEN** it SHALL compare the computed signature with the `X-Signature` header
- **THEN** it SHALL output `✅` or `❌` accordingly

#### Scenario: Check delivery status in Payflow
- **WHEN** the signature is verified
- **THEN** the script SHALL GET `/api/v1/webhooks/endpoints/{endpointId}/deliveries`
- **THEN** it SHALL display event name, delivery status, attempt count, and HTTP status code

#### Scenario: Optional token cleanup
- **WHEN** the `--cleanup` flag is passed
- **THEN** the script SHALL DELETE `https://webhook.site/token/{uuid}` to remove the inbox
- **WHEN** `--cleanup` is NOT passed
- **THEN** the script SHALL print the webhook.site URL for visual inspection

#### Scenario: Output summary
- **WHEN** all steps complete
- **THEN** the script SHALL print a summary showing:
  - webhook.site URL for visual inspection
  - HMAC signature match result
  - Delivery status from Payflow
  - Overall PASS/FAIL verdict
