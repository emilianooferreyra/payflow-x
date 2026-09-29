# Wallet Safety Specification

## Purpose

Prevent double-spend and overdraw in wallet operations through idempotency and optimistic concurrency control.

## Requirements

### Requirement: Idempotent wallet mutations

`POST /wallet/deposit`, `/withdraw`, and `/exchange` SHALL accept an optional `Idempotency-Key` header. If present, duplicate keys SHALL replay the original response without executing the operation again.

#### Scenario: First request with key creates transaction
- GIVEN a valid deposit payload with `Idempotency-Key: abc-123`
- WHEN the request is processed
- THEN a deposit transaction SHALL be created
- AND the response SHALL return `201 Created` with the transaction data

#### Scenario: Duplicate key replays response
- GIVEN the same `Idempotency-Key: abc-123` is sent again
- WHEN the request is processed
- THEN no new transaction SHALL be created
- AND the response SHALL return the same data as the first request

#### Scenario: Request without key works normally
- GIVEN a deposit payload without `Idempotency-Key`
- WHEN the request is processed
- THEN a deposit transaction SHALL be created normally

### Requirement: Idempotency record expiration

Idempotency records SHALL expire after 24 hours. A background cleanup SHALL remove expired records.

#### Scenario: Expired key allows new operation
- GIVEN an idempotency record older than 24 hours
- WHEN a request with that same key arrives
- THEN the system SHALL process it as a new operation

### Requirement: Optimistic locking on Wallet balance

Wallet SHALL have a `version` field. Balance updates SHALL use `UPDATE ... WHERE id = X AND version = V`. If no row matches, the transaction SHALL retry up to 3 times.

#### Scenario: Concurrent withdraws prevent overdraw
- GIVEN a wallet with balance 100 and version 1
- WHEN two concurrent withdraws of 60 are attempted
- THEN the first SHALL succeed (balance 40, version 2)
- AND the second SHALL fail with insufficient balance

#### Scenario: Retry succeeds on stale read
- GIVEN a wallet at version 1
- WHEN an exchange reads version 1 but another operation updates it to version 2
- THEN the exchange SHALL retry, read the updated version, and proceed

### Requirement: Version increment on all mutations

Every balance change (deposit, withdraw, exchange) SHALL increment the `version` field by exactly 1.

#### Scenario: Deposit increments version
- GIVEN a wallet at version 1, balance 100
- WHEN a deposit of 50 succeeds
- THEN version SHALL be 2, balance SHALL be 150

#### Scenario: Withdraw decrements balance and increments version
- GIVEN a wallet at version 2, balance 150
- WHEN a withdraw of 30 succeeds
- THEN version SHALL be 3, balance SHALL be 120
