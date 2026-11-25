DROP POLICY IF EXISTS jrv_recinto_asigna_veedor ON public.jrv;

CREATE POLICY jrv_recinto_asigna_veedor
  ON public.jrv
  FOR UPDATE
  TO authenticated
  USING (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
  )
  WITH CHECK (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
    AND (
      veedor_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.perfiles_usuario AS perfil
        WHERE perfil.id = veedor_id
          AND perfil.rol = 'VEEDOR'::public.rol_usuario
          AND perfil.recinto_id = public.obtener_recinto_actual()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.storage_acta_usuario_autorizado(p_nombre text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_nombre ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(ALCALDIA|PREFECTURA)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png)$'
    THEN
      public.veedor_tiene_jrv(split_part(p_nombre, '/', 1)::uuid)
      OR (
        public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
        AND EXISTS (
          SELECT 1
          FROM public.jrv AS mesa
          WHERE mesa.id = split_part(p_nombre, '/', 1)::uuid
            AND mesa.recinto_id = public.obtener_recinto_actual()
        )
      )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.storage_acta_usuario_autorizado(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_acta_usuario_autorizado(text) TO authenticated;

DROP POLICY IF EXISTS veedor_lee_fotos_de_jrv_asignada ON storage.objects;
DROP POLICY IF EXISTS veedor_subir_fotos_de_jrv_asignada ON storage.objects;
DROP POLICY IF EXISTS veedor_actualiza_fotos_de_jrv_asignada ON storage.objects;
DROP POLICY IF EXISTS veedor_elimina_fotos_de_jrv_asignada ON storage.objects;
DROP FUNCTION IF EXISTS public.storage_acta_veedor_autorizado(text);
DROP POLICY IF EXISTS usuario_lee_fotos_de_actas_autorizadas ON storage.objects;
DROP POLICY IF EXISTS usuario_subir_fotos_de_actas_autorizadas ON storage.objects;
DROP POLICY IF EXISTS usuario_actualiza_fotos_de_actas_autorizadas ON storage.objects;
DROP POLICY IF EXISTS usuario_elimina_fotos_de_actas_autorizadas ON storage.objects;

CREATE POLICY usuario_lee_fotos_de_actas_autorizadas
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND public.storage_acta_usuario_autorizado(name)
  );

CREATE POLICY usuario_subir_fotos_de_actas_autorizadas
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'actas'
    AND public.storage_acta_usuario_autorizado(name)
  );

CREATE POLICY usuario_actualiza_fotos_de_actas_autorizadas
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND public.storage_acta_usuario_autorizado(name)
  )
  WITH CHECK (
    bucket_id = 'actas'
    AND public.storage_acta_usuario_autorizado(name)
  );

CREATE POLICY usuario_elimina_fotos_de_actas_autorizadas
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND public.storage_acta_usuario_autorizado(name)
  );
