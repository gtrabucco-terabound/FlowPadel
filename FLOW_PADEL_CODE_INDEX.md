# FLOW_PADEL_CODE_INDEX.md

> Inventario del estado actual del código de FlowPadel. Solo hechos observados.
> Repo: `C:\PadelFlow\FlowPadel-Web` · Proyecto Supabase: `ruppicqugjpnosuxyaoi` · Fecha: 2026-07-15.
> Complementa a `CURRENT_ARCHITECTURE_FLOW_PADEL.md`.

---

## 1. Páginas (`app/**/page.tsx` y equivalentes)

### Públicas / jugador

| Ruta | Archivo | Renderiza |
|---|---|---|
| `/` | `app/page.tsx` | Home: hero, grilla de próximos eventos (realtime), top ranking. |
| `/reservar` | `app/reservar/page.tsx` | Lista de clubes con reserva online (`public_booking_clubs`). |
| `/reservar/[slug]` | `app/reservar/[slug]/page.tsx` | Grilla de turnos del día de un club (`public_court_day`) + `PublicBooking`. |
| `/torneos` | `app/torneos/page.tsx` | Listado público de torneos (`TournamentsFiltered`). |
| `/ranking` | `app/ranking/page.tsx` | Ranking jugadores (top 50 ELO) + clubes (`club_ranking`). |
| `/event/[slug]` | `app/event/[slug]/page.tsx` | Detalle público de evento (zonas, standings, bracket, liga) + `generateMetadata`. |
| `/register/[slug]` | `app/register/[slug]/page.tsx` | Formulario de inscripción (`RegistrationForm`), cupo/lista de espera. |
| `/sumarme/[code]` | `app/sumarme/[code]/page.tsx` | Reclamo de cupo de pareja (`ClaimForm`). |
| `/pagar/[id]` | `app/pagar/[id]/page.tsx` | Redirección/estado de pago de reserva (`public_booking_payinfo`). |
| `/perfil` | `app/perfil/page.tsx` | Perfil del jugador + "Mi seguimiento". |
| `/notificaciones` | `app/notificaciones/page.tsx` | Últimas 50 notificaciones del jugador. |

### Auth (grupo `(auth)`)

| Ruta | Archivo | Renderiza |
|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Card "Ingresar" (`AuthForm` + `loginAction`). |
| `/register-account` | `app/(auth)/register-account/page.tsx` | Card "Crear cuenta" (`AuthForm` + `signupAction`). |
| `/verifica-email` | `app/(auth)/verifica-email/page.tsx` | Aviso "Revisá tu email". |
| `/recuperar` | `app/(auth)/recuperar/page.tsx` | Card "Recuperar contraseña" (`RecoverForm`). |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | Card "Nueva contraseña" (`ResetForm`). |

### Admin

| Ruta | Archivo | Renderiza |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | Dashboard: métricas + eventos recientes. |
| `/admin/events` | `app/admin/events/page.tsx` | Lista de eventos + `NewEventDialog` + `InterclubChallenges`. |
| `/admin/events/[id]` | `app/admin/events/[id]/page.tsx` | Gestión de evento (`EventManager`). |
| `/admin/miembros` | `app/admin/miembros/page.tsx` | `MembersManager` + `OperatorRequests` (solo club_admin). |
| `/admin/clubes` | `app/admin/clubes/page.tsx` | ABM de clubes (solo superadmin). |
| `/admin/agenda` | `app/admin/agenda/page.tsx` | Agenda de canchas (`AgendaView`). |
| `/admin/calendario` | `app/admin/calendario/page.tsx` | Calendario de eventos + choques de fecha. |
| `/admin/turnos-fijos` | `app/admin/turnos-fijos/page.tsx` | Turnos fijos + cobros (`FixedBookingsManager`). |
| `/admin/players` | `app/admin/players/page.tsx` | Directorio global de jugadores (top 200 ELO, `?q=`). |
| `/admin/prospectos` | `app/admin/prospectos/page.tsx` | CRM de leads + invitaciones por evento. |
| `/admin/proyeccion` | `app/admin/proyeccion/page.tsx` | Proyección económica de eventos. |
| `/admin/settings` | `app/admin/settings/page.tsx` | Ajustes del club (`SettingsManager`). |
| `/admin/operar` | `app/admin/operar/page.tsx` | Solicitar operar clubes (`OperarManager`). |

### Layouts / especiales

| Archivo | Rol |
|---|---|
| `app/layout.tsx` | Root layout (tema, header/footer condicional por `x-pathname`). |
| `app/(auth)/layout.tsx` | Layout centrado de auth. |
| `app/admin/layout.tsx` | Layout del panel (contexto admin, sidebar, switcher). |
| `app/not-found.tsx` | 404 global. |
| `app/globals.css` | Estilos globales. |

---

## 2. Componentes

### `components/` (raíz)

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `site-header.tsx` | Server | Header público (usuario, notifs, nav, menú móvil). |
| `site-header-mobile.tsx` | Client | Menú hamburguesa (`MobileMenu`). |
| `site-footer.tsx` | Server | Footer. |
| `logo.tsx` | Server | Marca SVG "FlowPadel". |
| `theme-toggle.tsx` | Client | Toggle dark/light. |
| `event-card.tsx` | Server | Tarjeta de evento. |
| `events-grid-realtime.tsx` | Client | Grilla de eventos con Supabase Realtime. |
| `tournaments-filtered.tsx` | Client | Torneos con filtros. |
| `ranking-list.tsx` | Server | Ranking de jugadores. |
| `club-ranking-list.tsx` | Server | Ranking de clubes. |
| `top-ranking.tsx` | Server | Sección top ranking (home). |
| `ranking-tabs.tsx` | Client | Tabs Jugadores/Clubes. |
| `auth-form.tsx` | Client | Login/signup (`useActionState`). |
| `claim-form.tsx` | Client | Reclamo de compañero. |
| `registration-form.tsx` | Client | Inscripción (react-hook-form + zod). |
| `profile-form.tsx` | Client | Edición de perfil + upload de imagen. |
| `bracket-view.tsx` | Client | Cuadro de eliminación. |
| `event-detail-tabs.tsx` | Client | Detalle de evento con tabs (realtime). |
| `public-booking.tsx` | Client | Reserva pública de cancha (`createPublicBooking`). |

### `components/ui/`

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `button.tsx` | Server | Botón con variantes (`cva`). |
| `card.tsx` | Server | `Card`/`CardHeader`/`CardContent`. |
| `badge.tsx` | Server | Badge con tonos. |
| `avatar.tsx` | Server | Avatar con iniciales. |
| `tabs.tsx` | Client | Tabs controlado. |

### `components/admin/`

| Archivo | Tipo | Responsabilidad |
|---|---|---|
| `sidebar-nav.tsx` | Client | Navegación lateral filtrada por rol. |
| `club-switcher.tsx` | Client | Selector de club activo (`setActiveClub`). |
| `event-manager.tsx` | Client | Gestión completa de evento (realtime). |
| `new-event-dialog.tsx` | Client | Diálogo de creación de evento. |
| `interclub-challenges.tsx` | Client | Desafíos interclub. |
| `agenda-grid.tsx` | Client | Grilla de agenda (crear/cancelar/pago). |
| `fixed-bookings-manager.tsx` | Client | Turnos fijos. |
| `clubes-manager.tsx` | Client | ABM de clubes + leads. |
| `members-manager.tsx` | Client | Miembros (roles club_admin/staff/operator). |
| `operar-manager.tsx` | Client | Solicitud de operar club. |
| `operator-requests.tsx` | Client | Aprobar/rechazar operadores. |
| `settings-manager.tsx` | Client | Ajustes: canchas, datos, pagos, cobro de reservas, ocupación. |

---

## 3. Hooks

**No existen hooks personalizados** (`use*.ts/tsx`) ni carpeta `hooks/`. Solo hooks nativos de React (`useState`, `useEffect`, `useTransition`, `useActionState`, `useMemo`, `useRef`), `useRouter`/`usePathname` (next/navigation) y `useForm` (react-hook-form) dentro de componentes.

---

## 4. Contexts

**No existen React Context ni Provider propios.** El estado se maneja por props, server actions y Realtime. El "contexto de club" es lógica de dominio en `lib/admin/club.ts` (cookie + consulta), no un React Context.

---

## 5. Servicios (`lib/`)

| Archivo | Provee |
|---|---|
| `lib/supabase/server.ts` | `createClient()` async server-side (`@supabase/ssr`, cookies). |
| `lib/supabase/client.ts` | `createClient()` browser (`createBrowserClient`). |
| `lib/supabase/middleware.ts` | `updateSession(request)` — refresh de sesión + header `x-pathname`. |
| `lib/admin/club.ts` | `getAdminContext()`, `requireClubAccess()`, `slugify()`, `ACTIVE_CLUB_COOKIE`, tipos `AdminMembership`/`AdminContext`. |
| `lib/database.types.ts` | Tipos generados de Supabase (`Database`, `Tables<>`, `Enums<>`). |
| `lib/utils.ts` | `cn()`, `initials()`. |
| `lib/format.ts` | `formatDate/DateTime/DateRange/Money` + mapeos de enums (estado/tipo/modalidad/categoría/etc.). |
| `lib/flyer-bg.ts` | `flyerBg(name)` → URL absoluta del fondo JPEG del flyer. |

No existe `lib/services/` ni wrappers dedicados de pagos/email en `lib/`; esa lógica está en Server Actions y Edge Functions.

---

## 6. APIs / Route handlers y Server Actions

### Route handlers (Next)

| Ruta | Archivo | Método | Propósito |
|---|---|---|---|
| `/auth/confirm` | `app/auth/confirm/route.ts` | GET | Verifica OTP de mails (confirmación/recupero) y crea sesión. |
| `/torneos/flyer` | `app/torneos/flyer/route.tsx` | GET | PNG OG con próximos 6 torneos. |
| `/ranking/flyer` | `app/ranking/flyer/route.tsx` | GET | PNG OG con top 10 jugadores. |

Generadores de imagen OG (no route handlers REST): `app/event/[slug]/opengraph-image.tsx`, `app/pagar/[id]/opengraph-image.tsx`.

No hay carpeta `app/api/*`.

### Server Actions por archivo

**`app/(auth)/actions.ts`** — `loginAction`, `signupAction`, `logoutAction`.
**`app/(auth)/recuperar/actions.ts`** — `requestPasswordReset`.
**`app/(auth)/reset-password/actions.ts`** — `updatePasswordAction`.
**`app/perfil/actions.ts`** — `updateMyPlayerProfile`.
**`app/notificaciones/actions.ts`** — `markAllNotificationsRead`.
**`app/reservar/[slug]/actions.ts`** — `createPublicBooking`.
**`app/register/[slug]/actions.ts`** — `createRegistrationPaymentLink`, `submitRegistration`.
**`app/admin/actions.ts`** — `setActiveClub`.
**`app/admin/events/actions.ts`** — `createEvent`, `acceptInterclubChallenge`.
**`app/admin/events/[id]/actions.ts`** — `approveRegistration`, `markPaymentPaid`, `markPaymentPending`, `generatePaymentLink`, `rejectRegistration`, `waitlistRegistration`, `generateZones`, `recordMatchResult`, `generateFixture`, `generateLeague`, `recordLeagueResult`, `generateBracket`, `updateEventSettings`, `saveEventEconomics`, `startTournament`, `blockTournamentCourts`, `unblockTournamentCourts`, `addManualRegistration`.
**`app/admin/miembros/actions.ts`** — `addMember`, `changeRole`, `removeMember`.
**`app/admin/clubes/actions.ts`** — `createClub`, `setClubActive`, `deleteClub`.
**`app/admin/agenda/actions.ts`** — `createBooking`, `createBookingWithPayment`, `generateBookingPaymentLink`, `cancelBooking`.
**`app/admin/turnos-fijos/actions.ts`** — `createFixedBooking`, `generateFixedCharge`, `deactivateFixedBooking`.
**`app/admin/settings/actions.ts`** — `updateClub`, `updateClubPayments`, `updateBookingCharge`, `updateOccupancy`, `disconnectClubPayments`, `createCourt`, `renameCourt`, `toggleCourtActive`, `updateCourtConfig`.
**`app/admin/operar/actions.ts`** — `requestOperateClub`, `decideOperatorRequest`.

### Schemas / validación

**`app/register/[slug]/schema.ts`** — `registrationSchema`, `accountSchema`, `claimSchema`; helpers `effectiveModality(ctx, chosen)`, `validatePair(ctx, input)`.

### Edge Functions (Supabase, desplegadas)

| Slug | Versión | En repo | Propósito |
|---|---|---|---|
| `mp-create-preference` | v1 | No | Link Checkout Pro para seña/inscripción de torneo. |
| `mp-booking-preference` | v3 | No | Link de pago de reserva de cancha. |
| `mp-fixed-charge` | v1 | No | Cobro de turno fijo por periodo. |
| `mp-webhook` | v4 | No | Webhook de Mercado Pago (confirma pagos). |
| `occupancy-publish` | v2 | No | Publica turnos libres + ofertas + invitaciones (WhatsApp/Evolution). |
| `fixed-bookings-cron` | v1 | No | Renovación/cron de turnos fijos. |
| `send-email` | v1 | No | Envío de email (utilitario). |
| `dispatch-emails` | v4 | **Sí** (`supabase/functions/dispatch-emails/`) | Worker de cola `tournament_invites` → SMTP Gmail. |

---

## 7. Modelos / Enums

Tipos generados en `lib/database.types.ts` (`Database`). Enums de dominio referenciados (valores observados): `payment_provider` (`cash | mercadopago | stripe | transfer | other`), roles de club (`club_admin | staff | operator`), estados de evento (`draft | open | in_progress | ...`), modalidad (caballeros/damas/mixto), categoría (fija / por suma), estados de reserva (libre/held/confirmed/paid/cancelada/bloqueada), estados de inscripción (pending/approved/rejected/waitlist), canales/estados de `tournament_invites` (`queued/sent/failed/skipped`). Mapeos de presentación en `lib/format.ts`.

---

## 8. Tablas (esquema `public` — 31)

| Tabla | Cols | Rol |
|---|---|---|
| `profiles` | 8 | Persona con auth; `global_role`. |
| `clubs` | 14 | Tenant raíz. |
| `club_members` | 6 | Membresía + rol (núcleo RLS). |
| `club_leads` | 7 | CRM de clubes mencionados. |
| `club_operator_requests` | 7 | Solicitudes de operador. |
| `club_payment_settings` | 8 | Token MP + política de cobro. |
| `club_occupancy` | 11 | Config motor de ocupación. |
| `players` | 26 | Jugador global (ELO, stats, preferencias). |
| `player_standings` | 11 | Ranking individual por evento. |
| `player_offer_invites` | 6 | Log de invitaciones de oferta (dedupe). |
| `courts` | 17 | Cancha física. |
| `court_bookings` | 23 | Reservas/bloqueos. |
| `court_offers` | 8 | Ofertas last-minute. |
| `fixed_bookings` | 14 | Turnos fijos mensuales. |
| `fixed_booking_charges` | 12 | Cobros por periodo. |
| `events` | 35 | Torneo / juego abierto. |
| `categories` | 6 | Divisiones por club. |
| `registrations` | 21 | Inscripciones. |
| `teams` | 12 | Parejas. |
| `zones` | 8 | Grupos. |
| `zone_teams` | 2 | Equipos por zona. |
| `standings` | 14 | Tabla de grupos materializada. |
| `matches` | 21 | Partidos (todas las fases). |
| `brackets` | 7 | Árbol de eliminación. |
| `rounds` | 7 | Jornadas de liga larga. |
| `elo_history` | 7 | Ledger de ELO. |
| `payments` | 15 | Cargo de inscripción (agnóstico). |
| `mp_payments` | 13 | Pagos Mercado Pago. |
| `notifications` | 9 | Avisos in-app. |
| `tournament_invites` | 8 | Cola de invitaciones. |
| `bot_sessions` | 4 | Estado del bot WhatsApp. |

### RPCs referenciados en código (no exhaustivo)

`public_booking_clubs`, `public_court_day`, `create_public_hold`, `public_booking_payinfo`, `club_ranking`, `event_approved_count`, `registration_phone_taken`, `upsert_club_lead`, `find_player_by_phone`, `add_club_member`, `admin_create_club`, `admin_delete_club`, `accept_interclub`, `operator_request_club`, `operator_decide`, `generate_division_zones`, `generate_americano`, `generate_league`, `generate_bracket`, `submit_match_result`, `eligible_offer_players`, `is_club_member`, `is_club_admin`, `is_superadmin`.

---

## 9. Rutas (mapa completo)

```
Públicas:
  /                         home
  /reservar                 lista de clubes
  /reservar/[slug]          turnos del día
  /torneos                  listado
  /torneos/flyer            PNG OG (GET)
  /ranking                  ranking
  /ranking/flyer            PNG OG (GET)
  /event/[slug]             detalle de evento (+ opengraph-image)
  /register/[slug]          inscripción
  /sumarme/[code]           reclamo de pareja
  /pagar/[id]               pago de reserva (+ opengraph-image)

Jugador:
  /perfil                   perfil + seguimiento
  /notificaciones           notificaciones

Auth:
  /login  /register-account  /verifica-email  /recuperar  /reset-password
  /auth/confirm             callback OTP (GET)

Admin:
  /admin                    dashboard
  /admin/events             lista de eventos
  /admin/events/[id]        gestión de evento
  /admin/miembros           miembros (club_admin)
  /admin/clubes             ABM clubes (superadmin)
  /admin/agenda             agenda de canchas
  /admin/calendario         calendario de eventos
  /admin/turnos-fijos       turnos fijos
  /admin/players            directorio de jugadores
  /admin/prospectos         CRM de leads
  /admin/proyeccion         proyección económica
  /admin/settings           ajustes del club
  /admin/operar             solicitar operar clubes
```

---

## 10. Archivos relevantes (configuración y raíz)

| Archivo | Rol |
|---|---|
| `next.config.ts` | `reactStrictMode`, `eslint.ignoreDuringBuilds: true`, `images.remotePatterns` (Supabase storage). |
| `middleware.ts` | Delega en `updateSession` (refresh de sesión + `x-pathname`); matcher excluye estáticos. |
| `package.json` | `flowpadel-web`; scripts `dev`/`build`/`start`/`lint`; deps clave abajo. |
| `postcss.config.mjs` | Tailwind v4 vía `@tailwindcss/postcss` (sin `tailwind.config`). |
| `.env.example` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `public/flyers/*.jpg` | Fondos de flyers (`torneos`, `ranking`, `pago`). |
| `supabase/email-templates/*.html` | `confirm-signup.html`, `reset-password.html`. |
| `supabase/functions/dispatch-emails/` | Edge function versionada (worker de emails). |

### Dependencias clave (`package.json`)

- `next` ^15.4.9 · `react` / `react-dom` ^19.2.1
- `@supabase/ssr` ^0.12.0 · `@supabase/supabase-js` ^2.49.4
- `zod` ^4.3.6 · `react-hook-form` ^7.72.0 · `@hookform/resolvers` ^5.2.2
- `date-fns` ^4.1.0 · `lucide-react` ^0.553.0
- `class-variance-authority` ^0.7.1 · `clsx` ^2.1.1 · `tailwind-merge` ^3.3.1
- dev: `typescript` ^5.9.3 · `tailwindcss` ^4.1.11 · `eslint` ^9.39.1 · `eslint-config-next` ^15.4.9

> Nota: no hay dependencias de `mercadopago`, `resend` ni SDK de WhatsApp en el `package.json` del front; esas integraciones viven en Edge Functions/servicios externos.
