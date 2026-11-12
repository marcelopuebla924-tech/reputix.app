# Reputix Director Checkpoint — 2026-11-12 4:20 p.m. PST

## Estado confirmado
- Repositorio: `marcelopuebla924-tech/reputix.app`, rama `main`.
- Commit verificado en los flujos: `c95fc673c9e31e05a19c6100bac412cd4edf484b`.
- GitHub Pages deployment #647: **success**.
- Reputix Browser QA #496, intento 2: **success**. El primer intento falló una vez en la prueba de perfil público; el reintento completo pasó.
- El conjunto de browser smoke tests incluye controles de homepage, accesibilidad, búsqueda, perfiles, traducción, envío de reseñas, fotos, registro/login, recuperación de contraseña, paneles, IA, mapas, controles móviles y estadísticas. El reintento aprobó todos los pasos del job.

## Base de datos
- Producción: proyecto `udvsrmfgjfinwbgvhchs`.
- Staging: proyecto `lzcyulncvjjxsyyivlty`.
- Comparación de catálogo: 25 tablas/vistas en ambos entornos; firmas de columnas idénticas.
- Diferencia de seguridad detectada: `owner_business_dashboard` y `owner_business_hourly_patterns` tienen `security_invoker=true` en staging; las vistas de producción no muestran esa opción.
- Asesores Supabase reportaron alertas para revisión: protección de contraseñas filtradas, funciones SECURITY DEFINER y tablas RLS sin políticas. No se aplicaron cambios de producción.

## Pull requests
- PR #33: propuesta RPC atómica para reclamar eventos Stripe; sigue draft, no integrar.
- PR #34: endurecimiento de autorización para respuestas de quejas; sigue draft, no integrar hasta revisar checks y alcance.

## Salvaguardas vigentes
- No borrar ni modificar negocios, cuentas, reseñas, fotos ni datos de clientes.
- No cambiar dominio, DNS ni CNAME.
- No tocar modo live de Stripe, precios, payouts, destino de webhooks ni configuración sensible de Auth sin autorización específica.
- No promover cambios de staging a producción sin revisar SQL exacto, dependencias, políticas y rollback.

## Próximos pasos ordenados
1. Inspeccionar definiciones completas y dependencias de las dos vistas de producción vs staging.
2. Preparar un cambio SQL mínimo y reversible para producción solo si el análisis confirma que es seguro; antes de ejecutar, validar impacto de RLS y permisos.
3. Revisar alertas de seguridad por objeto, no aplicar cambios masivos.
4. Revalidar PR #33 y #34, mantenerlos como borradores mientras falten pruebas.
5. Mantener pruebas de navegador y despliegue como puerta de calidad.

Checkpoint escrito en GitHub para continuidad.