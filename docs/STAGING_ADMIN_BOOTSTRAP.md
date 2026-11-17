# Reputix AI — acceso de administrador para staging

Este procedimiento crea el primer acceso administrativo **solo en Reputix-Staging**. No crea ni cambia usuarios de producción.

## Estado verificado (17 nov 2026)
- Proyecto Supabase: `lzcyulncvjjxsyyivlty` (Reputix-Staging).
- `auth.users`: 0 usuarios; 0 administradores con `app_metadata.reputix_role=admin`.
- Worker `reputix-ai-worker`: ACTIVE, versión 2, JWT obligatorio.
- Los nueve agentes están desactivados. Hay una tarea de auditoría read-only en cola y cero ejecuciones.

## Alta segura del primer administrador

1. Abre el proyecto Reputix-Staging en el Dashboard de Supabase. Confirma el ref `lzcyulncvjjxsyyivlty` antes de hacer cualquier cambio.
2. En **Authentication → Users**, crea/invita una cuenta usando el correo administrativo que Marcelo elija. Usa la invitación por correo o una contraseña fuerte que el propio administrador controle; no compartas contraseñas con el asistente.
3. Abre el usuario recién creado y edita **App Metadata** (no User Metadata) para añadir exactamente:
   ```json
   {
     "reputix_role": "admin"
   }
   ```
   No agregues otros roles ni cambies políticas globales de Auth.
4. Inicia sesión únicamente en una consola de staging que apunte a `https://lzcyulncvjjxsyyivlty.supabase.co` con la publishable key de ese mismo proyecto. No reutilices la sesión de producción.
5. Llama al worker con `{ "mode": "status" }`. Debe responder con `production_access: false`, `max_tasks_per_request: 1` y los indicadores booleanos de presencia de secretos. Nunca copies ni compartas valores de secretos.
6. Si falta `OPENAI_API_KEY` o la clave de servicio, detente. Configura secretos solo desde el panel de Secrets del proyecto staging; nunca los pegues en el navegador, chat, GitHub o documentación.
7. Antes de ejecutar la auditoría, verifica presupuesto/créditos y confirma el gasto máximo previsto. El primer `run_one` debe ser solo la auditoría de lectura asignada a `security_auditor`. Luego vuelve a desactivar el agente y verifica una sola ejecución persistida.

## Controles que no se deben omitir
- No usar el proyecto de producción `udvsrmfgjfinwbgvhchs`.
- No poner service-role keys ni OpenAI keys en el frontend.
- No cambiar `main`, Pages, dominio/DNS, Stripe, usuarios de producción ni datos de clientes.
- No habilitar otros ocho agentes ni activar ejecuciones recurrentes.
- El worker solo admite `status` y `run_one`; `run_one` procesa como máximo una tarea.

## Bloqueo actual
No se puede verificar el endpoint `status` hasta que exista una cuenta de staging con `app_metadata.reputix_role=admin` y una sesión válida de ese proyecto. No hay usuarios en Auth de staging al momento de este checkpoint.
