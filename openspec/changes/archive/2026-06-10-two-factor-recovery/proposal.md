# Proposal: 2FA Recovery & Hardening

## Intent

Current 2FA has no fallback if user loses TOTP device, no rate-limit on verify, and no "remember device" option. Users can get permanently locked out.

## Scope

### In Scope
- 10 single-use backup codes (argon2-hashed) generated on 2FA enable
- Rate limiting on `/auth/2fa/verify` (5 attempts per 15min per user)
- Optional "trust this device" cookie (30d) that skips 2FA on login
- Re-generate backup codes endpoint

### Out of Scope
- WebAuthn/hardware keys
- Push-based 2FA (separate change)
- TOTP algorithm/step overrides

## Approach

Backup codes stored in new `UserBackupCode` model (hashed with argon2). Rate limiting via in-memory Map per userId (5 attempts, 15min window). Device trust via signed JWT cookie `trusted_device` (30d) stored on successful 2FA verify.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | +UserBackupCode model |
| `src/modules/auth/auth.service.ts` | Modified | +Backup code methods, +rate limit check, +device trust |
| `src/modules/auth/auth.controller.ts` | Modified | +Regenerate codes endpoint |
| `src/modules/auth/dto/` | New | +VerifyBackupCodeDto |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User loses backup codes too | Low | Can only regenerate via support (future) |
| Rate-limit DoS on 2FA | Low | Per-user + global throttle combined |

## Rollback Plan

Remove `UserBackupCode` migration, revert auth.service.ts changes, remove device trust cookie check.

## Success Criteria

- [ ] User can generate 10 backup codes and use one to complete login
- [ ] Used backup code is immediately invalidated
- [ ] 5 failed 2FA attempts in 15min blocks further attempts
- [ ] "Trust this device" skips 2FA for 30 days
