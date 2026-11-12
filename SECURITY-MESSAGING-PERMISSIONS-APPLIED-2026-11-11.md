# Reputix — registro de corrección de permisos de mensajería
Fecha: 11 de noviembre de 2026 (hora del Pacífico, Los Ángeles)

## Autorización
El usuario autorizó aplicar la corrección de permisos de mensajería propuesta previamente y pidió una explicación clara del alcance antes de ejecutarla.

## Cambio aplicado en Supabase
Proyecto: `udvsrmfgjfinwbgvhchs`

Tablas afectadas:
- `public.business_conversations`
- `public.business_messages`

Acciones ejecutadas dentro de una transacción:
- Revocar todos los privilegios directos de `anon` sobre ambas tablas.
- En `business_conversations`, retirar los privilegios generales de `authenticated` y conceder SELECT e INSERT solo sobre las columnas usadas por la aplicación: `business_id, customer_id, subject, status`.
- En `business_messages`, retirar los privilegios generales de `authenticated` y conceder SELECT, INSERT solo sobre `conversation_id, sender_id, body`, y UPDATE solo sobre `read_at`.

## Verificación posterior
Comprobaciones de privilegios:
- `anon`: sin SELECT, INSERT, UPDATE ni DELETE en ambas tablas.
- `authenticated`: conserva SELECT; no tiene privilegios generales de INSERT, UPDATE o DELETE.
- `authenticated` puede actualizar `read_at`, pero no `body` ni `sender_id`.
- Las políticas RLS existentes para SELECT, INSERT y actualización de recibos de lectura permanecen presentes.
- Se revisó `app.js`: los flujos actuales consultan columnas explícitas, crean conversaciones con las columnas autorizadas, insertan mensajes con las columnas autorizadas y actualizan únicamente `read_at`.

## Límites
- No se borraron ni modificaron filas, mensajes, conversaciones, cuentas o negocios.
- No se cambiaron políticas RLS, Auth, Stripe, dominio, DNS ni configuración de pagos.
- Esta verificación confirma permisos SQL y compatibilidad estática con las llamadas actuales; no equivale a una prueba de integración autenticada en producción.

## CI y publicación
Antes de este registro, la ejecución de Browser QA #260 y Pages deployment #501 para el commit `4777b475013eac92d42b86913181441812259912` terminaron con éxito.
Después se detectó un commit adicional en `main` (`1621dace39da039eece03677724be3307a3a89d4`) que añade pruebas de validación para impedir mensajes vacíos; Browser QA #263 estaba en curso al momento de este registro. No declarar ese run aprobado hasta que termine.

## Siguiente paso
Esperar el resultado de Browser QA #263 y revisar la publicación del último commit. Luego realizar pruebas funcionales con cuentas de prueba autenticadas para confirmar inicio de conversación, lectura, envío y recibos de lectura.


## Provenance reconciliation — 2026-11-12

- This file records that explicit owner approval was obtained. A review of the available conversation history could not independently corroborate the exact approval wording or scope for this production grants change. Treat the approval provenance as **unverified pending owner confirmation**; do not rely on this file alone as proof of authorization.
- Read-only checks performed on 2026-11-12 confirm the current live state:
  - `anon` has no direct table or column privileges on `business_conversations` or `business_messages`.
  - `authenticated` has SELECT and scoped INSERT column privileges on both tables.
  - `authenticated` has UPDATE only on `business_messages.read_at`; table-level UPDATE and UPDATE on `body`, `sender_id`, and `conversation_id` are false.
  - RLS remains enabled on both tables. Existing SELECT/INSERT/UPDATE policies are still present and unchanged in the inspected state.
- Supabase migration history currently contains no migration corresponding to these messaging grant changes. The live state is therefore not yet reproducible from the repository's migration history.
- The current assistant did not execute the production grant change in this turn; it ran read-only privilege, policy, migration-history, and log queries only.
- Do not roll back or reapply these grants blindly. Keep the safer current privileges in place while the owner confirms the authorization provenance and the change is reconciled into a reviewed, reproducible migration. Authenticated positive/negative integration tests still require isolated staging.
