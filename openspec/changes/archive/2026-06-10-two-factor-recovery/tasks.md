# Tasks: 2FA Recovery & Hardening

## Phase 1: Foundation

- [x] 1.1 Add `UserBackupCode` model to `prisma/schema.prisma`
- [x] 1.2 Run `npx prisma migrate dev --name add-user-backup-code`

## Phase 2: Backup Codes

- [x] 2.1 Generate 10 codes in `auth.service.ts` on 2FA enable, store hashed
- [x] 2.2 Add backup code verification to `verifyTwoFactor` — accept 8-char backup codes
- [x] 2.3 Add `POST /auth/2fa/codes/regenerate` endpoint in controller

## Phase 3: Rate Limiting & Device Trust

- [x] 3.1 Add in-memory rate limiter (Map<userId, attempts[]>) to `verifyTwoFactor`
- [x] 3.2 Set `trusted_device` cookie on successful 2FA (30d JWT)
- [x] 3.3 Check `trusted_device` cookie in `login()` to skip 2FA

## Phase 4: Tests

- [x] 4.1 Write unit tests for backup code generate/verify/regenerate
- [x] 4.2 Write unit tests for rate limiting
- [x] 4.3 Write unit tests for trusted device flow
