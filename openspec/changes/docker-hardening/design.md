## Context

Review of `dockerfile`, compose files, `.dockerignore` and both workflows found the four defects listed in the proposal. Everything else reviewed (multi-stage build, non-root user, `internal` backend network, dev/prod overlay pattern, `prisma` in `dependencies` so `migrate deploy` runs offline) is kept as is.

## Decisions

### D1. Split health into live/ready, keep `/health` as alias

Liveness answers "should this process be restarted?". Readiness answers "should traffic be sent here?". Restarting an API because Redis is down does not fix Redis, it only produces restart storms.

| Option | Pros | Cons |
|---|---|---|
| **A. `/live` + `/ready`, `/health` aliases ready (chosen)** | Correct semantics, no breaking change | One deprecated route to remove later |
| B. `/live` + `/ready`, remove `/health` | Cleanest surface | Breaks any external monitor on `/health` |
| C. Keep a single `/health` | No work | Keeps the restart-storm risk |

### D2. Docker `HEALTHCHECK` uses `/live`; readiness is for orchestrators

The image `HEALTHCHECK` decides restarts, so it must only reflect process liveness. Dependency awareness in compose comes from `depends_on: condition: service_healthy`, not from the app healthcheck.

### D3. Gate publish with `needs`, inside one workflow

| Option | Pros | Cons |
|---|---|---|
| **A. Add a `publish` job with `needs: test` to `ci.yml` (chosen)** | Simple, same commit guaranteed, no SHA plumbing | `deploy.yml` is folded into `ci.yml` |
| B. `workflow_run` trigger on CI success | Keeps two files | Must check out `workflow_run.head_sha` explicitly; easy to publish the wrong commit |

The publish job runs only when `github.event_name == 'push' && github.ref == 'refs/heads/main'`. `workflow_dispatch` is dropped from the publish path because it would bypass the gate; a manual re-run of the workflow re-runs the tests first.

### D4. Tags via `docker/metadata-action`

`type=sha,prefix=sha-` plus `type=raw,value=latest`. Avoids hand-built tag strings.

### D5. Align image tags to major version

`postgres:16` and `redis:7` in compose and CI. Floating minor receives security patches, at the cost of less bit-for-bit reproducibility. Accepted: the volume `pgdata` stays compatible within major 16.

## Risks

- **Existing `pgdata` volume with `postgres:16.2`**: moving to `postgres:16` upgrades the minor version in place. Minor upgrades within a major are on-disk compatible. Mitigation: none needed beyond noting it in the PR.
- **Folding `deploy.yml` into `ci.yml`**: a typo could disable publishing silently. Mitigation: task 5.4 re-reads the final YAML against the spec scenarios.
- **No image build is run locally** (project rule: no builds after changes). Docker and workflow changes are verified statically and by the health unit tests; the first real check is the CI run on the PR.

## Follow-ups (not in this change)

- Run `prisma migrate deploy` as a release step instead of in `docker-entrypoint.sh`.
- Production secrets via a secret manager; document in `SECURITY.md`.
- Reuse one Redis client in `RedisHealthIndicator` instead of connecting on every call.
- Image vulnerability scan in CI.
