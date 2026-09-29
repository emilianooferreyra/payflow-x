# Design: Webhook Demo

## Technical Approach

Standalone script (`tsx scripts/webhook-demo.ts`) que:
1. Crea inbox en webhook.site via `POST /token`
2. Registra endpoint en payflow via `POST /api/v1/webhooks/endpoints`
3. Dispara depósito via `POST /api/v1/wallet/deposit`
4. Espera y verifica delivery via `GET /api/v1/webhooks/endpoints/:id/deliveries`
5. Opcional: consulta webhook.site para ver el request recibido
6. Muestra resumen en consola

## Architecture Decisions

### Decision: Standalone script vs NestJS CLI command

| Opción | Tradeoff |
|--------|----------|
| **Standalone script (elegido)** | Cero acoplamiento, corre independiente, no necesita nest build |
| NestJS Console Command | Depende del módulo de Nest, más boilerplate, menos portable |

### Decision: API calls con fetch nativo

`fetch` ya está disponible en Node 18+ y todas las API expuestas son HTTP. Sin dependencias extra.

### Decision: Auth vía JWT directo

Para simplificar el demo, el script acepta un JWT por env/arg en vez de hacer login flow.

## Data Flow

```
webhook-demo.ts
    │
    ├──→ POST https://webhook.site/token ──→ inbox URL + UUID
    │
    ├──→ POST /api/v1/webhooks/endpoints { url: inboxURL } ──→ endpointId + secret
    │
    ├──→ POST /api/v1/wallet/deposit ──→ trigger deposit.confirmed
    │
    ├──→ GET /api/v1/webhooks/endpoints/:id/deliveries ──→ delivery status
    │
    └──→ console.table() ──→ resumen
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/webhook-demo.ts` | Create | Script de demo automatizado |
| `package.json` | Modify | + `"webhook:demo": "tsx scripts/webhook-demo.ts"` |

## Testing Strategy

Manual: correr el script y verificar que el webhook llega a webhook.site. No se automatiza — es un tool de verificación, no lógica de negocio.

## Migration / Rollout

No migration required.
