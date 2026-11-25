INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'actas',
  'actas',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png']::text[]
)
ON CONFLICT (id)
DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_acta_veedor_autorizado(p_nombre text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_nombre ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(ALCALDIA|PREFECTURA)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png)$'
    THEN public.veedor_tiene_jrv(split_part(p_nombre, '/', 1)::uuid)
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.storage_acta_veedor_autorizado(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_acta_veedor_autorizado(text) TO authenticated;

CREATE POLICY veedor_lee_fotos_de_jrv_asignada
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND public.storage_acta_veedor_autorizado(name)
  );

CREATE POLICY veedor_subir_fotos_de_jrv_asignada
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'actas'
    AND public.storage_acta_veedor_autorizado(name)
  );

CREATE POLICY veedor_actualiza_fotos_de_jrv_asignada
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND public.storage_acta_veedor_autorizado(name)
  )
  WITH CHECK (
    bucket_id = 'actas'
    AND public.storage_acta_veedor_autorizado(name)
  );

CREATE POLICY veedor_elimina_fotos_de_jrv_asignada
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'actas'
    AND public.storage_acta_veedor_autorizado(name)
  );
