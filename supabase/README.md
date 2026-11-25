# Configuración de Supabase

Ejecuta los scripts SQL en este orden en el proyecto Supabase:

1. `schema.sql`
2. `rls_roles.sql`
3. `rpc_auth.sql`
4. `storage_actas.sql`
5. `recinto_coordinador.sql`

`storage_actas.sql` crea el bucket privado `actas` y las políticas de Storage para que cada veedor lea, suba y elimine fotos únicamente en las JRV que tiene asignadas. Depende de la función `public.veedor_tiene_jrv(uuid)` definida en `schema.sql`.

`recinto_coordinador.sql` limita la asignación de veedores a cuentas del mismo recinto y amplía las políticas de Storage para que los coordinadores corrijan fotos de sus propias JRV.

Despliega `functions/crear-veedor` como Supabase Edge Function. Configura `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` como secretos del servidor; la clave `service_role` solo se utiliza en la función y nunca en la aplicación. La función valida la sesión/rol del coordinador y crea la cuenta con clave inicial `Ecuador2026`, sin cambiar la sesión del coordinador.

Los scripts crean políticas. Ejecuta los scripts iniciales una sola vez por proyecto; `recinto_coordinador.sql` es una migración que puede reaplicarse.
