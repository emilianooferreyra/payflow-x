## 1. Build context

- [x] 1.1 Rewrite `.dockerignore` so every pattern is on its own line; add `.pnpm-store`, `.env.*` with `!.env.template`, `.github/`, `**/.DS_Store`
- [x] 1.2 Re-read the file byte-wise (`od -c`) to confirm no fused lines

## 2. Health probes (TDD)

- [x] 2.1 RED: create `src/modules/health/health.controller.spec.ts` covering the four scenarios of `service-health-probes` with a mocked `HealthCheckService`; run it and see it fail
- [x] 2.2 GREEN: add `live()` and `ready()` to `HealthController`; keep `check()` delegating to `ready()` and mark it deprecated for Swagger
- [x] 2.3 Run the health spec and see it pass
- [x] 2.4 Confirm `/health/live` is not blocked by the CSRF guard, the throttler or the idempotency interceptor — verified: GET is a safe method for CsrfGuard, the idempotency interceptor is opt-in via decorator, and the global ThrottlerGuard (60/min per IP) would apply, so `@SkipThrottle()` was added to the controller (not in the original plan)

## 3. Container and compose

- [x] 3.1 Change the `HEALTHCHECK` in `dockerfile` to `/api/v1/health/live`
- [x] 3.2 Add a `redis-cli ping` healthcheck to `auth-redis` in `docker-compose.yml` (prod overlay must keep `--requirepass`, so the check authenticates with `REDIS_PASSWORD` when set)
- [x] 3.3 Switch `app.depends_on.auth-redis.condition` to `service_healthy`
- [x] 3.4 Set `postgres:16` and `redis:7` in `docker-compose.yml`

## 4. Pipeline

- [x] 4.1 Add a `publish` job to `.github/workflows/ci.yml` with `needs: test`, gated on push to `main`
- [x] 4.2 Use `docker/metadata-action` for `sha-<short>` and `latest` tags
- [x] 4.3 Remove `.github/workflows/deploy.yml` (its steps now live in `ci.yml`)
- [x] 4.4 Re-read the final YAML against every scenario of `release-pipeline`

## 5. Verification

- [x] 5.1 `pnpm typecheck`
- [x] 5.2 `pnpm test` (unit suite, including the new health spec) — 37 suites, 259 tests passing
- [ ] 5.3 Walk each scenario of the three specs and mark how it was verified (test, static read, or CI on the PR)
- [ ] 5.4 Open the PR from `chore/docker-hardening` with the verification table in the description
