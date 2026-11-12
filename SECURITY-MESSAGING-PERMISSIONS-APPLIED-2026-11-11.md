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
