## Why

El script `scripts/webhook-demo.ts` actual usa un receiver HTTP local (puerto 9999) que requiere Docker networking (`host.docker.internal`). No permite verificar visualmente la entrega ni funciona fuera de entorno local. Usar webhook.site da una URL pública real, verificación visual, y funciona desde cualquier entorno.

## What Changes

- Actualizar `scripts/webhook-demo.ts` para usar webhook.site en vez de receiver local
- Crear inbox via `POST https://webhook.site/token`
- Verificar entrega vía `GET /token/{uuid}/requests`
- Agregar `WEBHOOK_SITE_API_KEY` como env opcional (para asociar token a cuenta Pro)
- Agregar `--cleanup` flag para eliminar el token de webhook.site al finalizar

## Capabilities

### Modified Capabilities
- `webhook`: Demo script actualizado de receiver local → webhook.site

## Impact

- **Modified**: `scripts/webhook-demo.ts` — reemplazar receiver local por webhook.site
- **Dependencies**: Ninguna nueva (solo `node:crypto` y `fetch` nativo, ya disponibles)
