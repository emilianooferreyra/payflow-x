## 1. Shared IP Utility

- [x] 1.1 Create `src/common/utils/ip.util.ts` with `extractIp(req)` and `isPrivateIp(ip)` — canonical implementation from design D1
- [x] 1.2 Replace `AuthController.extractIp()` private method with import from util
- [x] 1.3 Replace `RecaptchaGuard` inline IP extraction + `isLocalIp()` with imports from util
- [x] 1.4 Replace `GeolocationService.isPrivateIp()` with import from util

## 2. OAuth Login Deduplication

- [x] 2.1 Extract `private async oauthLogin(user, provider, res, userAgent?, ip?)` in `AuthService`
- [x] 2.2 Refactor `googleLogin` to delegate to `oauthLogin`
- [x] 2.3 Refactor `appleLogin` to delegate to `oauthLogin`

## 3. Observability Fixes

- [x] 3.1 Fix stray `new Logger("AppleStrategy")` in constructor — extract module-level `const appleLogger`
- [x] 3.2 Replace `.catch(() => null)` in `AuthService.refresh` with `.catch((err) => { this.logger.error(...); return null; })`
- [x] 3.3 Replace `this.eventEmitter.emit("session.created", ...)` with `await this.eventEmitter.emitAsync(...)` + `.catch(err => logger.error(...))`
- [x] 3.4 Add `Logger` to `SessionService` (needed for 3.3)

## 4. Verification

- [x] 4.1 Run `pnpm tsc --noEmit` — zero errors
- [x] 4.2 Run `pnpm test` — all existing tests pass
