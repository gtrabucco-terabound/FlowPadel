# 4. Arquitectura técnica objetivo

## Principio

Mantener un monolito modular en Next.js + Supabase durante los próximos 6 meses. No introducir microservicios salvo necesidad comprobada.

## Capas

1. UI y rutas.
2. Application Services.
3. Domain Services.
4. Repositories / Supabase adapters.
5. Integrations.
6. Database / RLS / RPC.
7. Agent Runtime.
8. Audit / Observability.

## Organización propuesta

```text
app/
  (public)/
  player/
  club/
  marketplace/
  bos/
modules/
  identity/
  clubs/
  players/
  reservations/
  tournaments/
  marketplace/
  orders/
  inventory/
  suppliers/
  imports/
  payments/
  invoicing/
  agents/
  approvals/
  reporting/
lib/
  services/
  repositories/
  integrations/
  domain/
  observability/
  security/
supabase/
  migrations/
  functions/
  seed/
  types/
```

## Reglas

- Server Actions orquestan, no concentran lógica compleja.
- Acceso a datos mediante repositorios.
- Integraciones externas mediante adaptadores.
- Toda mutación sensible genera auditoría.
- Toda tarea agente tiene correlation_id.
- RPCs y RLS versionados.
- Contratos tipados compartidos.

## Multi-tenancy

- club_id para datos del club.
- seller_id para marketplace.
- organization_scope para agentes.
- BOS global mediante política explícita.
- comerciales solo en clubes autorizados.

## Pagos

Conservar pagos actuales de reservas y torneos. Crear order_payments para marketplace y reutilizar adaptadores Mercado Pago.

## Observabilidad

Logs estructurados, Sentry o equivalente, métricas de funciones, auditoría de webhooks, health checks, alertas y tracking de agentes.
