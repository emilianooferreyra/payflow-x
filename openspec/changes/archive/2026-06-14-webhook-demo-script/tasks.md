## 1. Replace receiver with webhook.site API

- [ ] 1.1 Replace `startReceiver()` — remove local HTTP server, call `POST https://webhook.site/token` instead. Use `WEBHOOK_SITE_TOKEN` env var if set to skip API call.
- [ ] 1.2 Add `waitForWebhookSiteRequest(uuid, secret)` — polls `GET https://webhook.site/token/{uuid}/request/latest` with backoff (1s, 2s, 4s, 8s max). Returns `{ payload, signature }`.

## 2. Update main flow

- [ ] 2.1 Update `main()` — replace `waitForWebhook()` with `waitForWebhookSiteRequest()`. Print webhook.site URL for visual inspection.
- [ ] 2.2 Handle errors: webhook.site unreachable → clear error with fallback suggestion
- [ ] 2.3 Add `--cleanup` flag: if set, `DELETE https://webhook.site/token/{uuid}` after all checks

## 3. Verify

- [ ] 3.1 Run `npx tsx scripts/webhook-demo.ts --help` — script compiles and shows usage
- [ ] 3.2 Run dry: `npx tsx scripts/webhook-demo.ts` with PAYFLOW_JWT set and API running — completes end-to-end
