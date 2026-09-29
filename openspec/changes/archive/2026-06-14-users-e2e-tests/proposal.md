# Proposal: Users Controller E2E Tests

## Intent

Add e2e tests for the Users controller (`GET /users/me`, `PATCH /users/me`) following the same real-DB pattern as auth, wallet, and two-factor tests.

## Scope

### In Scope
- `GET /users/me` — returns profile with KYC for authenticated user
- `GET /users/me` — returns 401 without auth cookie
- `PATCH /users/me` — updates name successfully
- `PATCH /users/me` — returns 400 for invalid email
- `PATCH /users/me` — returns 401 without auth cookie
- `PATCH /users/me` — returns 400 for empty name

### Out of Scope
- Session controller tests (next change)
- Edge cases like rate limiting or idempotency (deferred)

## Approach

Same pattern as existing e2e tests: `Test.createTestingModule(AppModule)`, real DB via `PrismaService`, `cleanDatabase` in beforeEach, JWT auth via access_token cookie.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `e2e/users.e2e-spec.ts` | New | Test file with 6 test cases |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| KYC relation in profile may return unexpected shape | Low | Check response shape in test assertions |

## Dependencies

- CI workflow already configured and passing
- Test database isolation (`authdb_test`) already in place

## Success Criteria

- [ ] All 6 tests pass locally
- [ ] All 6 tests pass in CI
