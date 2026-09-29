## Context

Code review of 5 recent auth/security commits identified 6 issues: two IP utilities implemented independently with behavioral divergence on `::ffff:`-prefixed addresses; `googleLogin`/`appleLogin` are identical algorithms; a stray `Logger` allocation in `AppleStrategy`'s constructor; async listener rejections silently discarded; and DB errors in `refresh` swallowed without logging. None changes external API contracts or data models.

## Goals / Non-Goals

**Goals:**
- Single source of truth for IP extraction and private-IP detection
- Fix array-unwrap bug in `RecaptchaGuard` (`x-forwarded-for` as array → `"[object Object]"`)
- Fix behavioral divergence: `::ffff:10.0.0.1` returns `false` in `GeolocationService` but `true` in `RecaptchaGuard`
- Eliminate `googleLogin`/`appleLogin` copy-paste via shared private helper
- Surface listener and DB errors via logger instead of swallowing them silently

**Non-Goals:**
- Moving guards or services to `src/integrations/` (that belongs to `modular-architecture-refactor`)
- Extracting `generateCsrfToken` to a `CsrfService` (architectural refactor, separate change)
- Fixing the redundant `findOne` preflight in `SessionService.update/delete` (pre-existing, separate change)

## Decisions

### D1 — Shared util in `src/common/utils/ip.util.ts`

**Decision:** Export `extractIp(req)` and `isPrivateIp(ip)` as plain functions from a new utility file.

**Rationale:** Both are pure functions with no NestJS dependencies. A plain module is the right altitude — no need for an injectable service. The `modular-architecture-refactor` change will eventually move consumers (`RecaptchaGuard`, `GeolocationService`) to `src/integrations/`, but the util stays in `src/common/utils/` untouched — no migration needed then.

**Alternative considered:** Inject `GeolocationService` into `RecaptchaGuard` to reuse its `isPrivateIp`. Rejected — leaks a domain service into a cross-cutting guard for the sole purpose of a range check.

**Canonical implementation (merges both diverging versions):**
```ts
export function isPrivateIp(ip: string): boolean {
  const clean = ip.replace("::ffff:", ""); // normalize mapped IPv4
  if (["127.0.0.1", "::1", "localhost"].includes(clean)) return true;
  if (clean.startsWith("10.") || clean.startsWith("192.168.")) return true;
  if (clean.startsWith("172.")) {
    const second = parseInt(clean.split(".")[1], 10);
    return second >= 16 && second <= 31;
  }
  return false;
}
```

### D2 — `private oauthLogin()` helper in `AuthService`

**Decision:** Extract a `private async oauthLogin(user, provider, res, userAgent, ip)` method. `googleLogin` and `appleLogin` become thin adapters.

**Rationale:** The two methods are identical modulo type, provider enum, and error message. A private helper with those as parameters collapses them without changing the public API.

**Alternative considered:** A strategy pattern or separate service. Rejected — two callers don't justify a new abstraction layer.

### D3 — `emitAsync` for `session.created`

**Decision:** Replace `this.eventEmitter.emit(...)` with `await this.eventEmitter.emitAsync(...)` and catch errors.

**Rationale:** `EventEmitter2`'s `emit` invokes async handlers synchronously, discarding their returned promise. If `GeolocationListener.handleSessionCreated` rejects, the error is swallowed. `emitAsync` returns a `Promise<any[]>` that we can `.catch()`.

**Alternative considered:** Keep `emit` and wrap the listener in a top-level try/catch. Rejected — the listener already has try/catch, but the event emitter itself needs the await boundary to propagate failures to the right error boundary.

### D4 — Logger for `.catch(() => null)` in `AuthService.refresh`

**Decision:** Change `.catch(() => null)` to `.catch((err) => { this.logger.error(...); return null; })`.

**Rationale:** Silently returning `null` on a DB error reports it to the client as "Session invalid" — correct from a security perspective, but causes ops blindness. Logging the real cause preserves the security behavior while restoring observability.

### D5 — Module-level logger constant for `AppleStrategy`

**Decision:** Extract `const appleLogger = new Logger("AppleStrategy")` at module scope so it's available before `super()`.

**Rationale:** `this.logger` is a class field initialized after `super()` returns — it cannot be used in the constructor body before `super()` is called. A module-level constant is the simplest fix without restructuring the constructor.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Changing `isPrivateIp` behavior for `::ffff:` prefixed IPs in `GeolocationService` | The old behavior was a bug (e.g., `::ffff:10.0.0.1` should be private). Canonical version fixes it. |
| `emitAsync` makes `SessionService.create` slower if listener is slow | Listener does a Redis cache lookup + HTTP call with 3s timeout. This is acceptable: session creation is not on a sub-millisecond hot path. If it becomes an issue, fire-and-forget with explicit `.catch` is the fallback. |
