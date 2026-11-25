# Configuración de Supabase

Ejecuta los scripts SQL en este orden en el proyecto Supabase:

1. `schema.sql`
2. `rls_roles.sql`
3. `rpc_auth.sql`
4. `provincial.sql`
5. `storage_actas.sql`
6. `recinto_coordinador.sql`

`storage_actas.sql` crea el bucket privado `actas` y las políticas de Storage para que cada veedor lea, suba y elimine fotos únicamente en las JRV que tiene asignadas. Depende de la función `public.veedor_tiene_jrv(uuid)` definida en `schema.sql`.

`recinto_coordinador.sql` limita la asignación de veedores a cuentas del mismo recinto y amplía las políticas de Storage para que los coordinadores corrijan fotos de sus propias JRV.

`provincial.sql` crea atómicamente cada recinto con sus JRV, limita a un coordinador por recinto y define la consulta agregada de votos. Antes de aplicarlo, resuelve cualquier recinto que ya tenga varios perfiles coordinadores.

Despliega `functions/crear-veedor` y `functions/crear-coordinador` como Supabase Edge Functions. Configura `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` como secretos del servidor; la clave `service_role` solo se utiliza en las funciones y nunca en la aplicación. Las funciones validan el rol del solicitante y crean las cuentas con clave inicial `Ecuador2026`, sin cambiar la sesión actual.

Los scripts iniciales se ejecutan una sola vez por proyecto; `provincial.sql` y `recinto_coordinador.sql` pueden reaplicarse.
