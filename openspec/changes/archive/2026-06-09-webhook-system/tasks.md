## 1. Database

- [x] 1.1 Add WebhookEndpoint and WebhookDelivery models to Prisma schema
- [x] 1.2 Run Prisma migration

## 2. Core Service

- [x] 2.1 Create WebhookModule with service skeleton
- [x] 2.2 Implement HMAC-SHA256 signing
- [x] 2.3 Implement dispatch logic (POST + retry with backoff)
- [x] 2.4 Create WebhookEndpoint DTOs (create, list)

## 3. Controller

- [x] 3.1 Create WebhookController with CRUD endpoints
- [x] 3.2 Add list deliveries endpoint

## 4. Integration

- [x] 4.1 Hook dispatch into WalletService deposit
- [x] 4.2 Hook dispatch into WalletService withdraw
