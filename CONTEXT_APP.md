# FlowPadel: Contexto de la Aplicación

Este documento proporciona una visión detallada de FlowPadel, una plataforma integral para la gestión de eventos de pádel en tiempo real. Este contexto está diseñado para facilitar la integración de un agente de IA en un entorno VPS.

## 1. Identidad del Proyecto
**Nombre:** FlowPadel (PadelFlow)
**Propósito:** Gestión de torneos, partidos abiertos ("cancha abierta") y visualización de resultados en tiempo real para clubes de pádel.
**Enfoque:** Experiencia de usuario premium, actualizaciones en vivo y administración simplificada.

## 2. Stack Tecnológico
- **Frontend:** Next.js 15 (React 19) con App Router.
- **Estilizado:** TailwindCSS 4 (moderno, basado en variables CSS).
- **Animaciones:** Motion (framer-motion).
- **BaaS (Backend as a Service):** Firebase (v12).
  - **Auth:** Gestión de sesiones para admins y staff.
  - **Firestore:** Base de datos NoSQL documental en tiempo real.
  - **Storage:** Almacenamiento de imágenes y media.
- **AI:** Integración con Google Generative AI (`@google/genai`).
- **Contenedorización:** Docker (soporte para despliegue en VPS).

## 3. Modelo de Datos (Firestore)
La base de datos se organiza en colecciones raíz. A continuación, el esquema principal (basado en `firebase-blueprint.json`):

### Colecciones Principales
- **`events`**: El núcleo de la app. Representa torneos o partidos abiertos.
  - Campos: `name`, `slug`, `event_type` (torneo/cancha_abierta), `status` (draft/open/in_progress/closed), `start_date`, `club_id`.
- **`registrations`**: Inscripciones de jugadores a eventos.
  - Campos: `player_1_name`, `player_1_phone`, `status` (pending/approved/rejected), `event_id`.
- **`players`**: Repositorio maestro de jugadores para evitar duplicidad.
- **`matches`**: Partidos específicos dentro de un evento.
  - Campos: `team_a_id`, `team_b_id`, `games_a`, `games_b`, `phase` (open_play/group_stage/final, etc.), `status`.
- **`profiles`**: Perfiles de administración con roles (`admin`, `staff`).
- **`clubs`**: Información de los complejos deportivos (nombre, ciudad, dirección).
- **`teams`, `zones`, `categories`**: Estructuras de apoyo para la lógica de torneos (fases de grupos, categorías por nivel, equipos formados).

## 4. Flujos de Usuario Principales

### A. Flujo Público (Jugador)
1. **Landing Page:** Visualización de eventos activos y próximamente visibles (`public_visible: true`).
2. **Registro:** El usuario selecciona un evento y completa el formulario de inscripción (`app/register`).
3. **Seguimiento:** Los usuarios pueden ver cuadros (brackets), zonas y resultados de partidos en tiempo real.

### B. Flujo Administrativo (Club/Staff)
1. **Login:** Acceso mediante Firebase Auth (`app/admin/login`).
2. **Dashboard:** Resumen de métricas y acceso rápido a la gestión.
3. **Gestión de Eventos:** Creación de torneos, configuración de categorías y aprobación de inscripciones.
4. **Operación en Vivo:** Carga de resultados de partidos, actualización de estados de zonas y avance en las llaves del torneo.

## 5. Interacción con la Base de datos
La aplicación utiliza el SDK de Firebase Client tradicional con componentes de servidor y cliente en Next.js.
- **Configuración:** Centralizada en `lib/firebase.ts`.
- **Lectura:** Realizada mayormente en Server Components (ej. `app/page.tsx`) para SEO y performance inicial, y vía hooks/SDK directo en el cliente para updates en tiempo real.
- **Seguridad:** Controlada por `firestore.rules`, restringiendo las escrituras a usuarios con rol `admin` y permitiendo lecturas públicas según la visibilidad del evento.

## 6. Contexto para el Agente (VPS)

### Ubicación del Código
El proyecto reside en la raíz del espacio de trabajo. Los archivos críticos para entender la lógica de negocio son:
- `lib/types.ts`: Definición de interfaces TypeScript.
- `firebase-blueprint.json`: Especificación técnica de la DB y flujos.
- `firestore.rules`: Lógica de permisos.

### Despliegue y Ejecución
- El `Dockerfile` está configurado para modo desarrollo (`npm run dev`) por defecto.
- Para un agente en VPS, se recomienda:
  1. Configurar variables de entorno (`.env`) basadas en `.env.example`.
  2. Usar `npm run build` y `npm run start` para producción.
  3. El puerto por defecto es el `3000`.

### Integración de IA
La presencia de `@google/genai` sugiere que la aplicación puede interactuar con modelos Gemini para:
- Análisis de resultados.
- Generación de descripciones de eventos.
- Asistencia en la creación de cuadros de torneos.

---
*Este documento es dinámico y debe actualizarse ante cambios significativos en el esquema de datos o la arquitectura.*
