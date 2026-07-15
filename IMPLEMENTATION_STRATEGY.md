# IMPLEMENTATION_STRATEGY.md — Flow Platform v1.0 sobre FlowPadel real

> Entregable exigido por `FlowPlatformSpecification_v1_0/12_CLAUDE_EXECUTION_PROMPT.md`.
> Estado: **borrador para aprobación humana**. No se programa código de features hasta el OK.
> Fecha: 2026-07-15 · Autor: Jarbis (flota FlowPadel) · Repo: `C:\PadelFlow\FlowPadel-Web`.

## Decisiones del dueño (2026-07-15) que enmarcan este plan
1. **Arquitectura:** migración **completa** a la estructura `modules/ · repositories/ · domain/` (no incremental).
2. **Secuencia:** **cerrar la estabilización primero**; la próxima palanca (Marketplace vs. profundizar COS vs. BOS) se decide al terminar la Fase 0/1.
3. **Higiene P0:** empezar **ya** la parte segura (versionar DB + edge functions + CI + tests), sin tocar secretos; la rotación de credenciales se coordina aparte.

---

## 1. Diagnóstico

FlowPadel es una app Next.js 15 + Supabase **productiva y funcional** (reservas, agenda, canchas, torneos, ranking, pagos MP, turnos fijos, operadores, prospectos, motor de ocupación, WhatsApp). El producto de club (Flow COS) **ya es vendible**; lo que falta es **orden, estabilidad y presentación comercial**, más tres capacidades nuevas (Marketplace, BOS, Oficina de Agentes) y **deuda técnica de base**.

La spec v1.0 está **aterrizada**: su análisis de brechas coincide con la auditoría independiente (`CURRENT_ARCHITECTURE_FLOW_PADEL.md`). No hay que reescribir; hay que **ordenar, versionar y extender**.

## 2. Inconsistencias detectadas en la spec (a resolver)

| # | Inconsistencia | Resolución adoptada |
|---|---|---|
| I-1 | Doc 02 dice "7 de 8 edge functions fuera del repo"; doc 05 dice "recuperar las 8". | Son 8 desplegadas; 1 (`dispatch-emails`) ya versionada. Se versionan las **7 restantes**. |
| I-2 | Doc 12 usa P0/P1/P2 + IDs EPIC/CAPABILITY/REQ/TASK; doc 14 usa P0–P6 sin IDs. | Se unifica en un **backlog con IDs** (EPIC→CAP→REQ→TASK) y prioridad P0–P6. Entregable 2. |
| I-3 | Doc 13 lista tablas nuevas **sin columnas**. | Antes de crear cualquier tabla nueva se diseña el **detalle columna-por-columna** de las críticas y se aprueba (Data Gate). |
| I-4 | "No reescribir" (doc 01) vs. reorganización total de carpetas (doc 04) + decisión del dueño de migración completa. | Se concilia: **migración completa pero sin cambiar comportamiento**, en tajadas verificadas y con tests como red previa (ver §4 y §7). |
| I-5 | Backend histórico citado como Firebase en artefactos de la flota. | El backend vigente es **Supabase** (`ruppicqugjpnosuxyaoi`). Se actualizan los artefactos de la flota en Fase 0. |

## 3. Mapa de reutilización (reutilizar antes de crear)

| Necesidad de la spec | Se reutiliza | No se duplica |
|---|---|---|
| Identidad/usuarios | `profiles`, `players`, Supabase Auth | ❌ nuevos usuarios |
| Multi-tenant | `club_id` + `club_members` + RLS | ❌ nuevo modelo de permisos |
| Pagos marketplace | adaptador Mercado Pago existente (`mp-*` edge functions) vía nuevo `order_payments` | ❌ nueva pasarela ni duplicar `payments` |
| Roles/operadores | enum de rol + modelo operador ya existente | ❌ nuevo RBAC |
| Asistentes de club | motor de ocupación + canal segmentado ya construidos | ❌ nuevo runtime de cero |
| Gobernanza de agentes | lo que Jarbis ya hace (routing, autonomía, aprobaciones) → se formaliza en datos | ❌ nueva orquestación |
| Flyers/OG, notificaciones, realtime | infraestructura existente | ❌ |

## 4. Arquitectura objetivo (decisión: migración completa, ejecución segura)

Estructura destino (doc 04), a alcanzar **en tajadas verificadas**:

```
app/            (public)/ player/ club/ marketplace/ bos/
modules/        identity clubs players reservations tournaments
                marketplace orders inventory suppliers imports
                payments invoicing agents approvals reporting
lib/            services/ repositories/ integrations/ domain/ observability/ security/
supabase/       migrations/ functions/ seed/ types/
```

**Reglas de arquitectura (doc 04):** Server Actions orquestan (no concentran lógica); acceso a datos por **repositorios**; integraciones por **adaptadores**; toda mutación sensible **audita**; toda tarea de agente lleva `correlation_id`; RPC y RLS **versionados**; contratos **tipados y compartidos**.

**Cómo migramos sin romper (mitigación de I-4):**
1. **Primero la red:** tests E2E de los 4 flujos críticos (login, reserva+hold+pago, torneo+resultado, cambio de club). Sin esta red no se mueve una carpeta.
2. **Tajadas por dominio:** mover un dominio a la vez (`payments` → `reservations` → `tournaments` → …), manteniendo **rutas y URLs idénticas**. Cada tajada: mover + reconectar imports + typecheck + tests + verificación en preview + commit.
3. **Capa de repositorios introducida al mover:** cada dominio migrado expone su acceso a datos vía `lib/repositories/*`; las Server Actions pasan a orquestar.
4. **Sin cambios de comportamiento** durante la migración: es refactor puro. Features nuevas van *después*, ya sobre la estructura nueva.

**Multi-tenancy:** `club_id` (club), `seller_id` (marketplace), `organization_scope` (agentes), BOS global por política explícita, comerciales solo en clubes autorizados.

## 5. Tareas por prioridad (visión; el detalle con IDs va en el Backlog — Entregable 2)

**P0 — Fundación técnica segura (arranca ya, sem 1-2)**
- Exportar esquema → **baseline migration** versionada; versionar RPC/triggers/RLS; seed mínimo.
- Bajar las **7 edge functions** faltantes al repo (`supabase/functions/*`), documentar sus env vars.
- **CI** (typecheck + lint + build + tests) y quitar el `ignoreDuringBuilds` cuando el lint pase.
- **Tests críticos** E2E (red de seguridad para el refactor).
- **Backups** + prueba de restauración; entorno **DEV** separado.
- Actualizar artefactos de la flota (Firebase→Supabase).
- *(Fuera de P0 automático: rotación de secretos — requiere OK humano y coordinación con Terabound.)*

**P0.5 — Migración de arquitectura (sem 2-4, sobre la red de tests)**
- Mover a `modules/`/`repositories/`/`domain/` en tajadas verificadas (ver §4).

**P1 — Ordenar y vender COS (sem 1-4, en paralelo a P0)**
- Capa de **nombres visibles** (Jugadores / Gestión del Club / Marketplace / Empresa).
- Sidebar ordenado, onboarding de club, estados vacíos, dashboard útil, reportes básicos.
- Landing, planes, demo, **Programa Fundadores**, ROI, casos de uso.
- Activar **email** (sacar de "dormido").

**P2+ — Nuevas capacidades (post-estabilización, se prioriza al cerrar Fase 1)**
- Marketplace MVP (venta propia), BOS mínimo, Oficina de Agentes, Import Center, etc. — **congelados detrás del gate de estabilización**.

## 6. Migraciones (enfoque)

- **Baseline first:** una migración que capture el esquema actual tal cual (sin cambios), como punto cero versionado.
- A partir de ahí, **toda** modificación de esquema es una migración incremental revisada por Data Gate + Security Gate, con **rollback** y **test de RLS** obligatorios.
- Ninguna tabla nueva antes del baseline (prohibición explícita de la spec).
- Tablas nuevas se diseñan con columnas definidas y aprobadas **antes** de crearlas.

## 7. Riesgos y mitigaciones

| Riesgo | Sev. | Mitigación |
|---|---|---|
| **Big-bang refactor rompe caja** (decisión de migración completa) | Alta | Tests E2E **antes** de mover; tajadas por dominio; URLs intactas; verificación en preview por tajada; commits atómicos reversibles. |
| Rotación de secretos rompe bots en producción (key Evolution compartida con Terabound) | Alta | Coordinar ventana con OK humano; verificar si es token por instancia vs. global antes de rotar. |
| Baseline de esquema difiere del real | Media | Generar desde el proyecto real (`db pull`/introspección) y validar contra `database.types.ts`. |
| Alcance de 6 meses sobredimensionado | Media | Gate de estabilización: no se abre P2+ hasta cerrar P0/P0.5/P1. |
| Duplicación de pagos/usuarios | Media | Mapa de reutilización (§3) + Data Gate. |
| CI rompe deploys al reactivar lint | Baja | Arreglar lint real antes de quitar `ignoreDuringBuilds`; no al revés. |

## 8. Plan semanal (Fase 0-1; el resto se planifica al cerrar el gate)

| Semana | Foco |
|---|---|
| 0-1 | Versionar (baseline DB + 7 edge functions) · CI base · arranque Programa Fundadores · red de tests E2E (inicio) |
| 1-2 | Completar tests críticos · backups + DEV · actualizar artefactos flota · nombres visibles (inicio) |
| 2-3 | Migración de arquitectura por tajadas (payments, reservations) · dashboard/onboarding COS |
| 3-4 | Migración (tournaments, resto) · landing/planes/demo · activar email · **cierre de estabilización** |
| 4 | **Gate de estabilización** → decidir próxima palanca (Marketplace / COS+ / BOS) |

## 9. Agentes responsables (flota)

| Trabajo | Agente | Gate |
|---|---|---|
| Estrategia, routing, trazabilidad | **Jarbis** | — |
| Blueprint/estimación de capacidades nuevas | **Hermes** | Architecture |
| Baseline DB, edge functions, CI, seguridad, release | **Tom EVO** (backend/devops/security/release) | Data, Security, Release |
| UX/UI web, nombres visibles, COS, marketplace UI, BOS UI | **Vorii** | QA, Commercial |
| App móvil | **Anii** | *(en espera de contratos web estables)* |

## 10. Gates (doc 11)

Architecture · Data · Security · QA · Release · Commercial. Ningún entregable pasa a "done" sin su(s) gate(s). Flujos críticos a cubrir por QA: login, jugador, club, cambio de club, reserva, hold, pago, webhook, torneo, resultado, ranking (+ catálogo/carrito/orden/stock/importación/tarea-agente cuando existan).

## 11. Criterios de Done (doc 11, resumen)

Funcional (criterios + happy path + errores + permisos + vacíos + responsive) · Técnica (typecheck + lint + tests + migración + rollback + logging + secrets) · Seguridad (RLS + auth + validación + idempotencia + auditoría) · Comercial (valor + onboarding + soporte + métricas + demo) · Agentes (scope + permisos + límites + aprobación + evidencia + auditoría + fallback).

## 12. Preguntas bloqueantes — RESUELTAS (2026-07-15)

1. **Rotación de secretos:** el token de Evolution es **por-instancia, dedicado a flowpadel**. → Podemos rotar la key de `flowpadel` **sin afectar `Bot_Anii`** (se conserva). La rotación es aislada y segura.
2. **Entorno DEV:** **proyecto Supabase separado en plan Free** ($0) dedicado a DEV; se aplican ahí las migraciones versionadas. (Supabase Branching se descartó por requerir Pro + costo.)
3. **CI/CD:** **GitHub Actions** (repo en GitHub).
4. **Programa Fundadores:** la flota arma el **paquete completo de materiales** (landing, planes/precios, demo, onboarding, ROI); el dueño se queda con la venta y la relación.

## 12-bis. Nueva capacidad incorporada: Gestión de Bots (multi-instancia)

Decisión del dueño: habrá **varios bots** (distintos estilos, distintas líneas de teléfono) y **bots privados por club** además del comunitario — capacidad **vendible**.

- Modelo: tabla `wa_instances` (instancia Evolution, línea/teléfono, tipo `community | private`, club asignado, credenciales en **secrets**, nunca en código).
- El motor de ocupación y los asistentes eligen la **instancia** según club/línea.
- Alta de un bot = crear + asignar instancia, sin tocar código.
- **Primer paso** de esta capacidad = mover `EVO`/`EVO_KEY`/`INSTANCE` de `occupancy-publish` a secrets (resuelve el único punto de credencial hardcodeada) + rotar la key.
- Ubicación en el mapa: Gestión del Club (config) + Oficina de Agentes (runtime). Se planifica al abrir el gate post-estabilización; el paso de secrets entra en P0.

---

### Próximos entregables (tras tu OK a este documento)
1. **Backlog ejecutable** con IDs (EPIC→CAPABILITY→REQ→TASK), dependencias, estimación, agente, aprobación y DoD por ítem.
2. **Diseño de datos detallado** (columnas) de las tablas críticas, solo cuando lleguemos al gate correspondiente.

> Regla honrada (doc 12): *"Solo programar features después de aprobación humana de IMPLEMENTATION_STRATEGY.md."* La única excepción que ya autorizaste: **versionar** (capturar estado actual al repo), que no cambia comportamiento.
