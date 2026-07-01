# FlowPadel-Web

Refundación de la app de gestión de torneos de pádel, ahora sobre **Supabase** (Next.js 15 App Router + React 19 + TypeScript strict + Tailwind CSS 4).

## Stack

- Next.js 15 (App Router) / React 19 / TypeScript strict
- Tailwind CSS 4 (`@import "tailwindcss"`), paleta teal/verde pádel (primario `#1D9E75`)
- `@supabase/supabase-js` + `@supabase/ssr`
- `react-hook-form` + `zod`, `date-fns` (locale es)

## Setup

```bash
npm install
npm run dev
```

Variables de entorno (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Rutas

| Ruta | Descripción |
| --- | --- |
| `/` | Landing: hero + grilla de eventos públicos (realtime) |
| `/event/[slug]` | Detalle público: Partidos / Posiciones / Cuadro (realtime) |
| `/register/[slug]` | Formulario de inscripción (status `pending`) |
| `/ranking` | Top 50 jugadores por `elo_rating` |
| `/login` | Login de jugador y admin |
| `/register-account` | Alta de cuenta de jugador |
| `/admin` | **Placeholder F2** (panel de administración) |

## Datos

Lectura pública vía RLS: `events` con `public_visible=true` (+ sus `teams/zones/matches/standings/brackets`), `players`, `clubs`, `categories`. INSERT público en `registrations` solo con `status='pending'` sobre evento `status='open'` y `public_visible=true`.

## Fases siguientes

- **F2 — Panel admin** (`/admin`): gestión de eventos, inscripciones (aprobar/rechazar), equipos, zonas, carga de resultados. Requiere `club_members`.
- **F3 — Brackets / ELO**: generación y visualización de cuadros de eliminación, cálculo de ELO (`elo_history`). La pestaña "Cuadro" hoy es placeholder.
