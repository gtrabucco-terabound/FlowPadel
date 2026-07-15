# 2. Estado actual y brechas

## Arquitectura vigente

Next.js 15, React 19, TypeScript, Tailwind 4 y Supabase con PostgreSQL, Auth, RLS, Storage, Realtime, Edge Functions y cron. Integraciones actuales: Mercado Pago, Evolution API, n8n y SMTP Gmail.

## Capacidades existentes

### Jugadores
- perfil;
- ranking;
- notificaciones;
- torneos;
- reservas;
- pagos.

### Clubes
- alta y gestión;
- miembros y roles;
- operadores;
- canchas;
- agenda;
- turnos fijos;
- reservas;
- torneos;
- economía;
- prospectos;
- motor de ocupación.

## Capacidades inexistentes

- Marketplace.
- Catálogo y SKU.
- Inventario comercial.
- Órdenes de compra.
- Importaciones.
- Proveedores.
- Costeo puesto.
- Vendedores externos.
- Envíos y devoluciones.
- Flow BOS.
- Oficina de Agentes.
- Bandeja unificada de aprobaciones.

## Deuda crítica

1. Migraciones no versionadas.
2. Siete de ocho Edge Functions fuera del repo.
3. Secretos hardcodeados.
4. Sin tests automatizados.
5. Contratos repartidos entre Server Actions, RPCs y Edge Functions.
6. Email dormido.
7. n8n externo no versionado.
8. Sin DEV separado.
9. Sin observabilidad integral.
10. Lint ignorado durante build.

## Qué no debe romperse

- Auth actual.
- profiles + players.
- multi-tenancy por club_id.
- club_members y roles.
- reservas.
- torneos.
- pagos actuales.
- motor de ocupación.
- URLs públicas.
