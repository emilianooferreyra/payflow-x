## Why

Code review of the auth+security commits revealed six duplication and observability issues: private-IP detection is implemented twice with diverging logic, IP extraction is duplicated with a subtle array-unwrap bug in the guard copy, `googleLogin`/`appleLogin` are structural copy-pastes, and three observability gaps let real errors disappear silently. These are maintenance liabilities before the planned modular-architecture-refactor lands.

## What Changes

- **NEW**: `src/common/utils/ip.util.ts` — shared `extractIp()` and `isPrivateIp()` utilities
- Replace `AuthController.extractIp()` private method with the shared util
- Replace `RecaptchaGuard.isLocalIp()` + inline IP extraction with the shared util (also fixes an array-unwrap bug on `x-forwarded-for`)
- Replace `GeolocationService.isPrivateIp()` with the shared util
- Extract `private oauthLogin()` helper in `AuthService` — `googleLogin` and `appleLogin` delegate to it
- Fix stray `new Logger("AppleStrategy")` dead allocation in `AppleStrategy` constructor (before `super()`)
- Replace `this.eventEmitter.emit()` with `emitAsync()` + catch in `SessionService.create()` so listener rejections are visible
- Add logger call to `.catch(() => null)` in `AuthService.refresh()` so DB errors are not silently swallowed

## Capabilities

### New Capabilities
- `ip-utils`: Shared IP extraction and private-IP detection utilities used across guards and services

### Modified Capabilities
<!-- No spec-level behavior changes — all fixes are implementation quality improvements -->

## Impact

| Area | Impact |
|------|--------|
| `src/common/utils/ip.util.ts` | New file |
| `src/modules/auth/auth.controller.ts` | Remove private `extractIp`, use util |
| `src/modules/auth/guards/recaptcha.guard.ts` | Remove `isLocalIp`, use util; fix IP extraction |
| `src/modules/auth/geolocation/geolocation.service.ts` | Remove `isPrivateIp`, use util |
| `src/modules/auth/auth.service.ts` | Extract `oauthLogin`, add logger to `.catch` |
| `src/modules/auth/strategies/apple.strategy.ts` | Fix stray Logger allocation |
| `src/modules/session/session.service.ts` | `emit` → `emitAsync` with error boundary |
