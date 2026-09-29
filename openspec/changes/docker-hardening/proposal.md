## Why

The container setup is solid in structure (multi-stage, non-root, internal backend network) but has four concrete defects found in review: a malformed `.dockerignore` line that lets `.pnpm-store` into the build context, a single `/health` endpoint that mixes liveness with readiness (a Redis blip marks a healthy process `unhealthy`), a deploy workflow that publishes `:latest` on every push to `main` without waiting for CI, and dependency images that drift between compose (`postgres:16.2`, `redis:7.2`) and CI (`postgres:16`, `redis:7`).

## What Changes

- Fix `.dockerignore`: the last two entries were fused into `eslint.config.mjs.pnpm-store`. Split them, and also ignore `.env.*` (except `.env.template`), `.github/` and `**/.DS_Store`.
- Split health into `GET /api/v1/health/live` (process only, no dependencies) and `GET /api/v1/health/ready` (database + Redis). `GET /api/v1/health` stays as a deprecated alias of `ready` so existing monitors keep working.
- Point the Dockerfile `HEALTHCHECK` at `/health/live`.
- Give `auth-redis` a real healthcheck and make the app wait for `service_healthy` instead of `service_started`.
- Align `postgres` and `redis` image tags between compose and CI (`postgres:16`, `redis:7`).
- Make the image publish depend on CI success and tag images `sha-<short>` in addition to `latest`, so a specific version can be rolled back to.
- **BREAKING**: none. The old `/health` path keeps its behavior.

## Capabilities

### New Capabilities
- `container-build-context`: what the Docker build context includes and excludes.
- `service-health-probes`: separate liveness and readiness contracts for the API.
- `release-pipeline`: when an image is published and how it is tagged.

### Modified Capabilities
- *(none — no existing spec in `openspec/specs/` covers these behaviors)*

## Impact

- **Modules**: `src/modules/health` only (controller + new spec).
- **Files**: `.dockerignore`, `dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`.
- **Dependencies**: none added.
- **Runtime**: `HEALTHCHECK` target changes; anything else calling `/health` is unaffected because the alias remains.
- **Out of scope (documented as follow-ups)**: running migrations as a release step instead of in the entrypoint, secrets management for production, Redis client reuse in `RedisHealthIndicator`, image vulnerability scanning.
