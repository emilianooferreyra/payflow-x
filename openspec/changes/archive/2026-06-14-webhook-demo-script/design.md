## Context

Script Node.js standalone (sin NestJS) que prueba el sistema de webhooks end-to-end usando webhook.site como receptor externo.

## Goals / Non-Goals

**Goals:**
- Reemplazar receiver HTTP local por webhook.site
- Crear inbox automáticamente via API
- Verificar que el webhook llegó con la firma HMAC correcta
- Mostrar link al dashboard de webhook.site para inspección visual

**Non-Goals:**
- No agregar dependencias npm (usar solo APIs nativas de Node.js 20+)
- No modificar el servicio de webhook ni controladores

## Decisions

**Usar webhook.site sin API key por defecto**: La creación de token via `POST /token` funciona sin autenticación. Si el usuario tiene cuenta Pro, puede pasar `WEBHOOK_SITE_API_KEY` para asociar el token a su cuenta y tener más features (rate limit, histórico).

**Polling con backoff simple**: webhook.site no tiene webhooks de callback para notificar llegada de requests. Usar `setTimeout` con backoff (1s, 2s, 4s, max 8s) y `GET /token/{uuid}/request/latest` hasta que aparezca el request.

**No borrar token automáticamente**: Para que el usuario pueda inspeccionar visualmente el resultado en webhook.site después de ejecutar el script. Se puede pasar `--cleanup` para borrarlo.

## Risks / Trade-offs

- **webhook.site rate limit**: 10 requests/minuto sin API key. Nuestro polling hace max 4 requests en ~15s, bien dentro del límite.
- **Disponibilidad**: Si webhook.site está caído, el script falla al crear el token. El spec ya contempla fallback vía `WEBHOOK_SITE_TOKEN` env var con un token pre-creado.
