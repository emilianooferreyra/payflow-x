## Exploration: Users Controller E2E Tests

### Current State
- Users controller has 2 endpoints: `GET /users/me` and `PATCH /users/me`
- Both require `JwtAuthGuard` (access_token cookie)
- `GET /me` returns user profile with KYC status included
- `PATCH /me` allows updating name, lastName, phone, email
- Infrastructure for e2e tests already exists: `setup-app.ts`, `cleanDatabase`, `setup-env.js`, `global-setup.js`
- Existing e2e tests follow a consistent pattern (auth, wallet, two-factor)

### Affected Areas
- `src/modules/users/users.controller.ts` — endpoints to test
- `src/modules/users/users.service.ts` — business logic exercised by tests
- `src/modules/users/dto/update-user.dto.ts` — validation rules to verify
- `e2e/users.e2e-spec.ts` — new test file to create
- `e2e/setup-app.ts` — shared bootstrap (no changes needed)
- `e2e/db-cleanup.ts` — table truncation (no changes needed)

### Test Scenarios

**GET /users/me**
1. Returns profile for authenticated user (includes kyc status)
2. Returns 401 without auth cookie
3. Returns profile with kyc when kyc exists
4. Returns profile without kyc when kyc doesn't exist

**PATCH /users/me**
1. Updates user name successfully
2. Returns 400 for invalid email
3. Returns 401 without auth cookie
4. Returns 400 for empty name (whitespace)

### Approach
Follow the same pattern as existing e2e tests:
- `Test.createTestingModule` with `AppModule`
- Real DB via `PrismaService`
- `cleanDatabase` in `beforeAll`/`beforeEach`
- Create user + session directly in `beforeEach`
- Generate JWT with `JwtService` for authentication
- `prisma.$disconnect()` in `afterAll`

### Ready for Proposal
Yes
