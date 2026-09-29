# Proposal: Auth Enhancements — Apple OAuth + ReCAPTCHA

## Intent

Add Apple OAuth (mandatory for App Store compliance) and Google ReCAPTCHA (bot protection on signup/login). Both are foundational improvements that benefit the existing app and the new portfolio features.

## Scope

### In Scope
- Apple OAuth: Sign in with Apple (web redirect + mobile token exchange)
- ReCAPTCHA v3: Validate on signup and login endpoints, invisible to users

### Out of Scope
- Passkeys / WebAuthn
- RBAC refactor
- Facebook / Microsoft OAuth
- SMS verification

## Approach

Apple OAuth follows the same pattern as existing Google OAuth — Passport strategy for web redirect, token validation for mobile. ReCAPTCHA uses Google's ReCAPTCHA v3 API — verify token on signup/login, reject if score below threshold. Both require env vars, no additional services.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/auth/` | Modified | Add Apple OAuth strategy + ReCAPTCHA guard |
| `prisma/schema.prisma` | Modified | Add `apple` to AuthProviderEnum |
| `src/app.module.ts` | Modified | Register Apple OAuth config |
| `.env.example` | Modified | Add APPLE_* and RECAPTCHA_* vars |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Apple OAuth requires Apple Developer ($99/yr) | High | Must enroll before testing; feature can be toggled via env var |
| ReCAPTCHA false positives | Low | Score threshold configurable; fallback to no captcha if key missing |

## Rollback Plan

Remove Apple OAuth config/strategy, remove ReCAPTCHA guard from signup/login routes. Auth continues working with Google + email/password.

## Dependencies

- Apple Developer account ($99/year)
- Google ReCAPTCHA v3 API keys (free)

## Success Criteria

- [ ] Apple OAuth login creates user with `authProvider: APPLE`
- [ ] ReCAPTCHA guard scores signup/login and rejects low-score requests
- [ ] Both features gracefully degrade if env vars are missing
