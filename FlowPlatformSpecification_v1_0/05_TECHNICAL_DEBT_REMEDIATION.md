# 5. Eliminación de deuda técnica

## P0

### Supabase
- exportar esquema;
- baseline migration;
- versionar RPCs, triggers y RLS;
- seed mínimo.

### Edge Functions
- recuperar las 8 funciones;
- incorporarlas al repo;
- documentar variables;
- validar payloads;
- idempotencia;
- logging.

### Secretos
- retirar claves hardcodeadas;
- usar secrets;
- rotar credenciales;
- revisar tokens MP.

### Backups
- backup base;
- export configuración;
- respaldo n8n;
- prueba de restauración.

## P1

- lint en build;
- typecheck obligatorio;
- tests unitarios;
- tests de RLS;
- E2E de login, reserva, pago y torneo;
- DEV separado;
- contratos de dominio;
- logging centralizado.

## P2

- revisar force-dynamic;
- encapsular Realtime;
- activar email;
- documentar n8n;
- separar instancia Evolution.

## Prohibiciones

- no crear tablas paralelas para evitar migrar;
- no duplicar pagos;
- no agregar secretos al repo;
- no desplegar sin backup;
- no modificar RLS sin test;
- no iniciar Marketplace antes del baseline de datos.
