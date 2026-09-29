# Proposal: Webhook Demo

## Intent

Probar el sistema de webhooks end-to-end con webhook.site. Verificar que el dispatch, HMAC signing, retry, y delivery tracking funcionan correctamente. Tener un script reproducible para demos futuras.

## Scope

### In Scope
- Script `scripts/webhook-demo.ts` que automatiza: crear endpoint en webhook.site, registrar endpoint en payflow, disparar eventos deposit/withdraw, mostrar deliveries
- Comando npm: `npm run webhook:demo`
- README-style output con URLs y resultados
- Prueba real exitosa con webhook.site

### Out of Scope
- Dashboard UI de webhooks (ya existe en frontend)
- Sistema de colas (SQS, RabbitMQ) — keep in-process setTimeout
- Webhook replay manual desde admin

## Approach

Script standalone con `tsx` que:
1. Lee `WEBHOOK_SITE_URL` de env o argumento
2. Crea endpoint via API → recibe secret
3. Dispara `POST /wallet/deposit` → trigger `deposit.confirmed`
4. Espera 2s → consulta deliveries vía API
5. Muestra resultado: URL webhook.site, payload enviado, signature, status de delivery
6. Opcional: webhook.site inbox URL para verlo llegar

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/webhook-demo.ts` | New | Script de demo automatizado |
| `package.json` | Modified | + `webhook:demo` script |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backend no corriendo | Low | Script checkea health endpoint primero |
| webhook.site API cambia | Low | Crear inbox manual como fallback |
| Rate limiting en dev | Low | Usar JWT de test existente |

## Rollback Plan

Eliminar `scripts/webhook-demo.ts`, revertir `package.json`. Ningún cambio en lógica de negocio.

## Dependencies

- Backend corriendo (dev o Railway)
- webhook.site accesible

## Success Criteria

- [ ] Script crea inbox en webhook.site
- [ ] Script registra endpoint en payflow
- [ ] Script dispara depósito y webhook llega a webhook.site
- [ ] Delivery aparece como "delivered" en API
- [ ] HMAC signature verificable
