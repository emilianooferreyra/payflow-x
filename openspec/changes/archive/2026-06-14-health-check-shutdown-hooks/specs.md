# Health Check & Shutdown Hooks

## Requirements

1. **Health Check Endpoint** — Expose `GET /api/v1/health` that Railway can call to verify the app is alive
2. **Database Health** — Verify PostgreSQL connection via Prisma `SELECT 1`
3. **Redis Health** — Verify Redis connectivity via `PING`
4. **Graceful Shutdown** — Properly close Prisma connections on SIGTERM/SIGINT

## Scenarios

### Health check — all services healthy
```
GET /api/v1/health
→ 200
{
  "status": "ok",
  "info": { "database": { "status": "up" }, "redis": { "status": "up" } },
  "error": {},
  "details": { "database": { "status": "up" }, "redis": { "status": "up" } }
}
```

### Health check — database down
```
GET /api/v1/health
→ 503
{
  "status": "error",
  "info": { "redis": { "status": "up" } },
  "error": { "database": { "status": "down", "message": "..." } },
  "details": { "database": { "status": "down", "message": "..." }, "redis": { "status": "up" } }
}
```

### Health check — redis down
```
GET /api/v1/health
→ 503
{
  "status": "error",
  "info": { "database": { "status": "up" } },
  "error": { "redis": { "status": "down", "message": "..." } },
  "details": { "database": { "status": "up" }, "redis": { "status": "down", "message": "..." } }
}
```

### Graceful shutdown — SIGTERM closes DB connection
```
kill <pid>
→ PrismaService.onModuleDestroy() called → $disconnect() → no connection leaks
```
