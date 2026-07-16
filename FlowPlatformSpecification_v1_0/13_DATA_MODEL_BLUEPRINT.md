# 13. Data Model Blueprint

## Principios

Reutilizar profiles, players, clubs y club_members. Mantener RLS. UUID, timestamps, auditoría, estados explícitos e idempotencia.

## Marketplace

brands, product_categories, products, product_variants, product_images, sellers, seller_members, listings, warehouses, inventory, inventory_movements, carts, cart_items, orders, order_items, order_payments, shipments, invoices y returns.

## Importaciones

suppliers, supplier_contacts, purchase_orders, purchase_order_items, imports, import_shipments, import_documents, import_costs e import_receipts.

## Agentes

agents, agent_capabilities, agent_assignments, agent_tasks, agent_task_events, approval_requests, approval_decisions, agent_reports, agent_audit_logs y agent_policies.

## Reglas

- orders no reutiliza payments de torneos como entidad principal.
- order_payments comparte adaptador MP.
- inventario por variante y depósito.
- stock disponible basado en movimientos o ledger.
- recepción de importación actualiza costo y stock transaccionalmente.
- tareas de agente nunca almacenan secretos.
