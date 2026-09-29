# Logging & Observability

Tres capacidades para mejorar la observabilidad en producción (Railway).

---

## A — Logging Interceptor

Interceptor global que loguea cada request HTTP entrante y saliente.

### Scenarios

#### Request logged on response
```
GET /api/v1/users/me → 200
Log: "GET /api/v1/users/me 200 42ms"

POST /api/v1/auth/login → 401
Log: "POST /api/v1/auth/login 401 15ms"
```

#### Error responses with status logged
```
GET /api/v1/wallet/999 → 404
Log: "GET /api/v1/wallet/999 404 3ms"
```

---

## B — Response Serialization Interceptor

Estandariza todas las respuestas exitosas con un envelope `{ data, meta }`.

### Scenarios

#### Success response wrapped
```
GET /api/v1/users/me → Response body: { data: { id: "...", email: "..." }, meta: { timestamp: "..." } }
```

#### Paginated response with meta
```
GET /api/v1/transactions?page=1&limit=10 → Response body: { data: [...], meta: { page: 1, limit: 10, total: 42, timestamp: "..." } }
```

#### Array response wrapped
```
GET /api/v1/exchange-rates/current → Response body: { data: [...rates], meta: { timestamp: "..." } }
```

#### Primitive response wrapped
```
POST /api/v1/kyc/submit → Response body: { data: { status: "IN_REVIEW", ... }, meta: { timestamp: "..." } }
```

---

## C — Structured Logging (Pino)

Reemplaza el Logger nativo de NestJS por `nestjs-pino` para logs JSON.

### Scenarios

#### JSON log line on request
```
Log output: {"level":30,"time":1718382000000,"pid":1234,"context":"LoggingInterceptor","method":"GET","url":"/api/v1/users/me","status":200,"duration":42,"msg":"request completed"}
```

#### JSON log line on error
```
Log output: {"level":50,"time":1718382000000,"pid":1234,"context":"GlobalExceptionFilter","status":500,"msg":"Internal server error","err":{...}}
```

#### Logger compatible with existing services
```
Existing services that use `private readonly logger = new Logger(X.name)` continue working, but output JSON.
```
