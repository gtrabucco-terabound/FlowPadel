# 6. Agent Platform y gobierno

## Dos flotas

### Software Factory
Jarbis, Hermes, Tom EVO, Vorii y Anii.

### Business Agent Office
Orquestador de negocio, Marketplace, Supplier, Buyer, Pricing, Inventory, Import, Finance, Tax, Marketing, CRM, Club Success, Support, Reporting y Hospitality futuro.

## Regla Buyer

Buyer trabaja exclusivamente para Flow Padel. No compra para clubes ni revela la red de proveedores internacionales.

## Modelo de tarea

Cada tarea registra id, agente, objetivo, scope, tenant, datos consultados, herramientas, estado, riesgo, propuesta, aprobación, resultado, evidencia, costo, timestamps y correlation_id.

## Estados

queued, analyzing, preparing, awaiting_approval, approved, rejected, executing, completed, failed, cancelled y human_intervention_required.

## Autonomía

- A0 observación.
- A1 preparación.
- A2 ejecución reversible.
- A3 aprobación humana.
- A4 prohibido sin humano.

## Automático

Reportes, anomalías, segmentación, borradores, costos estimados y conciliación preliminar.

## Con aprobación

Publicar productos, cambiar precios, enviar campañas, emitir OC, comprometer presupuesto y hacer reposición.

## Humano obligatorio

Declaraciones, impuestos, contratos, intimaciones, transferencias críticas, permisos y eliminaciones masivas.

## Vistas

### BOS
Oficina de Agentes completa.

### Club
Asistentes del Club con recomendaciones, campañas, aprobaciones, informes e historial.

## Actualización de la flota actual

- Jarbis: routing por capacidad y Definition of Done.
- Hermes: impacto comercial y trazabilidad.
- Tom: architecture, security y release gates.
- Vorii: skills commercial-ux, bos-module, agent-office-ui y marketplace-module.
- Anii: esperar contratos web estables.
