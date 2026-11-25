# Configuración de Supabase

Ejecuta los scripts SQL en este orden en el proyecto Supabase:

1. `schema.sql`
2. `rls_roles.sql`
3. `rpc_auth.sql`
4. `storage_actas.sql`

`storage_actas.sql` crea el bucket privado `actas` y las políticas de Storage para que cada veedor lea, suba y elimine fotos únicamente en las JRV que tiene asignadas. Depende de la función `public.veedor_tiene_jrv(uuid)` definida en `schema.sql`.

Los scripts crean políticas, por lo que deben aplicarse una sola vez por proyecto o mediante una migración que gestione explícitamente las políticas existentes.
