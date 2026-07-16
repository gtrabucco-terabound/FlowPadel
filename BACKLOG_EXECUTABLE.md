# BACKLOG_EXECUTABLE.md — Flow Platform v1.0

> Segundo entregable exigido por `12_CLAUDE_EXECUTION_PROMPT.md`.
> Estructura: EPIC → CAPABILITY → REQ → TASK. Con dependencia, estimación, agente, aprobación y DoD.
> Estado: **para aprobación**. Detalle fino en Fase 0/1 (decidida); P2+ a nivel épica (congelado tras el gate de estabilización).
> Leyenda estimación: S ≤ ½ día · M ≈ 1-2 días · L ≈ 3-5 días. Aprob.: 🟢 autónomo · 🟡 requiere OK humano.

---

## EPIC A — Fundación técnica (P0) · sem 1-2 · **objetivo: red de seguridad + todo versionado**

### CAP A1 — Versionar la base de datos
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A1-R1 | Baseline del esquema real a migración versionada | — | M | Tom/backend | 🟢 | Migración aplica en DEV limpio y reproduce el esquema actual; validada vs `database.types.ts` |
| A1-R2 | Versionar RPCs, triggers y políticas RLS | A1-R1 | L | Tom/backend | 🟢 | Todas las funciones/RLS existentes en `supabase/migrations`; diff cero contra prod |
| A1-R3 | Seed mínimo (club demo, categorías, cancha) | A1-R1 | S | Tom/backend | 🟢 | `supabase/seed` levanta un entorno usable |

### CAP A2 — Versionar Edge Functions ✅ (parcial hecho)
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A2-R1 | Bajar las 7 edge functions al repo | — | S | Jarbis | 🟢 | **HECHO** — `supabase/functions/*` versionadas |
| A2-R2 | Documentar env vars de cada función | A2-R1 | S | Tom/devops | 🟢 | README por función con sus `Deno.env` |

### CAP A3 — Entorno DEV separado
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A3-R1 | Crear proyecto Supabase Free "FlowPadel-DEV" | — | S | — | 🟡 | Proyecto creado (lo crea el humano o con OK); ref registrado |
| A3-R2 | Aplicar migraciones + seed en DEV | A1, A3-R1 | S | Tom/devops | 🟢 | DEV refleja el esquema; pruebas no tocan prod |

### CAP A4 — CI en GitHub Actions
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A4-R1 | Workflow: typecheck + build en cada push/PR | — | M | Tom/devops | 🟢 | PR muestra checks verdes; falla si rompe |
| A4-R2 | Arreglar lint real y quitar `ignoreDuringBuilds` | A4-R1 | M | Tom/frontend | 🟢 | Lint pasa; build no depende de ignorar lint |
| A4-R3 | Correr tests (CAP A5) en CI | A5 | S | Tom/devops | 🟢 | Tests corren en cada PR |

### CAP A5 — Red de tests críticos (prerrequisito del refactor)
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A5-R1 | E2E: login + cambio de club | A3 | M | Tom/qa | 🟢 | Test verde en DEV |
| A5-R2 | E2E: reserva → hold → pago (MP sandbox) | A3 | L | Tom/qa | 🟢 | Cubre held/expira/paga |
| A5-R3 | E2E: torneo → resultado → standings/ELO | A3 | L | Tom/qa | 🟢 | Verifica recompute |
| A5-R4 | Tests de RLS (aislamiento por club) | A3 | M | Tom/security | 🟢 | Un club no ve datos de otro |

### CAP A6 — Backups y secretos
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A6-R1 | Backup de base + export de config + respaldo n8n + prueba de restore | — | M | Tom/devops | 🟡 | Restore probado en DEV |
| A6-R2 | Mover `EVO/EVO_KEY/INSTANCE` de `occupancy-publish` a secrets | A2 | S | Tom/security | 🟡 | Sin credenciales en código; función usa `Deno.env` |
| A6-R3 | **Rotar** la EVO_KEY de la instancia flowpadel | A6-R2 | S | — | 🟡 | Key nueva activa; bot flowpadel funciona; Bot_Anii intacto |

### CAP A7 — Alinear artefactos de la flota
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| A7-R1 | Actualizar `fleet.json`/`CLAUDE.md`/rutas: Firebase→Supabase, apps reales | — | S | Jarbis | 🟢 | Artefactos reflejan el estado real |

---

## EPIC B — Migración de arquitectura (P0.5) · sem 2-4 · **sobre la red de tests (A5)**

### CAP B1 — Estructura destino sin cambiar comportamiento
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| B1-R1 | Crear esqueleto `modules/`, `lib/{services,repositories,domain,...}` | A5 | S | Tom/frontend | 🟢 | Estructura creada, vacía, sin romper build |
| B1-R2 | Migrar dominio **payments** (+ repositorio) | B1-R1 | M | Tom/backend | 🟢 | URLs iguales; tests A5 verdes; preview OK |
| B1-R3 | Migrar dominio **reservations** (+ repositorio) | B1-R2 | L | Tom/backend | 🟢 | idem |
| B1-R4 | Migrar dominio **tournaments** (+ repositorio) | B1-R3 | L | Tom/backend | 🟢 | idem |
| B1-R5 | Migrar **identity/clubs/players** y resto | B1-R4 | L | Tom/backend | 🟢 | idem |
| B1-R6 | Server Actions pasan a orquestar (lógica a services/domain) | B1-R5 | M | Tom/backend | 🟢 | Actions delgadas; lógica testeada |

> Regla de cada tajada B1-Rx: mover → reconectar imports → typecheck → tests A5 → verificar en preview → commit atómico. Rutas y URLs **idénticas**.

---

## EPIC C — Ordenar y vender COS (P1) · sem 1-4 · **en paralelo a A/B**

### CAP C1 — Capa de nombres visibles
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| C1-R1 | Mapear interno→visible (Jugadores/Gestión del Club/Marketplace/Empresa) en UI | — | M | Vorii | 🟢 | Cliente nunca ve nombres técnicos |

### CAP C2 — UX de club vendible
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| C2-R1 | Sidebar ordenado + menú visible (doc 07) | C1 | M | Vorii | 🟢 | Navegación clara, agrupada |
| C2-R2 | Onboarding de club (checklist de alta) | — | M | Vorii | 🟢 | Club nuevo operativo < 2 h |
| C2-R3 | Dashboard útil + estados vacíos + reportes básicos | — | L | Vorii | 🟢 | Métricas reales a la vista |
| C2-R4 | Activar email (sacar de "dormido") | A6 | M | Tom/backend | 🟡 | Avisos de torneo salen; cron activo |

### CAP C3 — Paquete Programa Fundadores
| ID | REQ / TASK | Dep. | Est. | Agente | Aprob. | DoD |
|---|---|---|---|---|---|---|
| C3-R1 | Landing comercial | C1 | M | Vorii | 🟢 | Publicada, responsive, con CTA |
| C3-R2 | Página de planes/precios | — | M | Vorii | 🟡 | Precios que definís vos |
| C3-R3 | Entorno demo estable | A3 | M | Vorii | 🟢 | Demo reproducible con datos seed |
| C3-R4 | Checklist onboarding + one-pager ROI + casos de uso | — | M | Vorii/Hermes | 🟢 | Materiales listos para vender |

---

## GATE DE ESTABILIZACIÓN (fin sem 4)
Se cierra A + B + C. **No se abre P2+ hasta pasar este gate.** Aquí decidís la próxima palanca (Marketplace / profundizar COS / BOS).

---

## EPIC D+ — Capacidades nuevas (P2-P6) · **congeladas tras el gate** (detalle al abrirlo)

| EPIC | Capacidad | Prioridad | Notas |
|---|---|---|---|
| D | Marketplace MVP (venta propia) — catálogo, carrito, órdenes, `order_payments`, stock | P2 · sem 3-8 | Data Gate: diseñar columnas antes de crear tablas |
| E | BOS mínimo (dashboard, productos, inventario, pedidos) | P3 · sem 5-10 | — |
| F | Oficina de Agentes (runtime, tareas, estados, aprobaciones, auditoría) | P4 · sem 8-14 | Formaliza lo que Jarbis ya hace; incluye **Gestión de Bots** |
| G | Import Center (proveedores, OC, costeo, recepción, Buyer AI) | P5 · sem 10-18 | Lo más lejano a caja; dinero real/aduana |
| H | Club Assistants avanzados (CRM, marketing, reporting, WhatsApp multi-bot) | P5 · sem 12-18 | Reutiliza motor de ocupación |
| I | Seller foundation, devoluciones, hospitality, móvil (Anii) | P6 · sem 18-24 | Diferido |

---

### Orden de arranque propuesto (Fase 0, apenas des el OK)
1. **A1-R1** baseline del esquema · **A2-R2** documentar env vars (A2-R1 ✅ hecho).
2. **A3-R1** crear proyecto DEV (necesita tu OK / creación).
3. **A4-R1** CI base en GitHub Actions.
4. **A5** red de tests → habilita EPIC B.
5. En paralelo **C1-R1** nombres visibles (bajo riesgo, alto impacto comercial).

> Nada de EPIC B (mover carpetas) arranca hasta que A5 esté verde. Nada de EPIC D+ hasta el gate.
