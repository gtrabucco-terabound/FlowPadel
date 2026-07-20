# `modules/` — Módulos de dominio

Parte de la migración de arquitectura (EPIC B del `BACKLOG_EXECUTABLE.md`).
Objetivo: mover la lógica de dominio fuera de las rutas (`app/`) y de los
Server Actions, hacia módulos con acceso a datos encapsulado.

## Convención

Cada dominio vive en `modules/<dominio>/` y co-loca sus piezas:

```
modules/<dominio>/
  repository.ts   # ACCESO A DATOS. Funciones puras que reciben el cliente
                  # Supabase y ejecutan queries. No hacen auth ni revalidate.
  service.ts      # (opcional) lógica de dominio que orquesta repositorios.
  types.ts        # (opcional) tipos del dominio.
```

## Reglas (del doc 04 de la spec)

- **Server Actions y páginas orquestan** (auth, validación, `revalidatePath`);
  **no concentran** el acceso a datos: lo delegan al `repository`.
- El `repository` recibe el cliente Supabase por parámetro (sirve para RSC y
  para acciones) y **no** toca `next/headers` ni sesión.
- La RLS sigue siendo la fuente de verdad de permisos: el repositorio confía en
  que el cliente ya viene con la sesión correcta.
- **No se cambia comportamiento** al migrar: las rutas y URLs quedan idénticas.

## Infra transversal

Lo que no es de un dominio puntual (integraciones externas, observabilidad,
seguridad) irá en `lib/integrations/`, `lib/observability/`, `lib/security/`
a medida que se necesite.

## Estado — EPIC B COMPLETO ✅

Cero acceso directo a datos en `app/`: todas las páginas y server actions
delegan a un módulo. Solo quedan `supabase.auth.*` (contexto de usuario) en la
capa de ruta, que es donde corresponde.

- [x] `notifications` — avisos in-app + email transaccional.
- [x] `ranking` — top de jugadores y ranking de clubes.
- [x] `players` — perfil, ficha de jugador, club-lead, standings, directorio.
- [x] `reservations` — reserva pública, agenda del club y turnos fijos
      (`repository.ts` + `fixed-repository.ts`).
- [x] `payments` — links de Checkout Pro, estado de pagos y config de cobro del club.
- [x] `clubs` — datos del club, canchas, ocupación, miembros, operadores, ABM superadmin.
- [x] `tournaments` — eventos/torneos: público, gestión, y las 18 acciones
      (`repository.ts` + `events-repository.ts`).
- [x] `identity` — envuelve Supabase Auth (signIn/signUp/signOut).
