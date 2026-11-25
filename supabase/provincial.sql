CREATE UNIQUE INDEX IF NOT EXISTS perfiles_un_coordinador_por_recinto
  ON public.perfiles_usuario (recinto_id)
  WHERE rol = 'RECINTO'::public.rol_usuario
    AND recinto_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.crear_recinto_con_jrv(
  p_provincia text,
  p_canton text,
  p_parroquia text,
  p_nombre text,
  p_cantidad_jrv integer
)
RETURNS public.recintos
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  recinto_creado public.recintos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR public.obtener_rol_actual() IS DISTINCT FROM 'PROVINCIAL'::public.rol_usuario
  THEN
    RAISE EXCEPTION 'Solo un usuario provincial puede crear recintos.'
      USING ERRCODE = '42501';
  END IF;

  IF p_provincia IS NULL OR pg_catalog.btrim(p_provincia) = ''
    OR p_canton IS NULL OR pg_catalog.btrim(p_canton) = ''
    OR p_parroquia IS NULL OR pg_catalog.btrim(p_parroquia) = ''
    OR p_nombre IS NULL OR pg_catalog.btrim(p_nombre) = ''
    OR p_cantidad_jrv IS NULL OR p_cantidad_jrv < 1
  THEN
    RAISE EXCEPTION 'Los datos del recinto no son válidos.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.recintos (provincia, canton, parroquia, nombre, cantidad_jrv)
  VALUES (
    pg_catalog.btrim(p_provincia),
    pg_catalog.btrim(p_canton),
    pg_catalog.btrim(p_parroquia),
    pg_catalog.btrim(p_nombre),
    p_cantidad_jrv
  )
  RETURNING * INTO recinto_creado;

  INSERT INTO public.jrv (recinto_id, numero_mesa)
  SELECT recinto_creado.id, mesas.numero_mesa
  FROM pg_catalog.generate_series(1, p_cantidad_jrv) AS mesas(numero_mesa);

  RETURN recinto_creado;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_recinto_con_jrv(text, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_recinto_con_jrv(text, text, text, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.obtener_resumen_votos_provincial()
RETURNS TABLE (
  recinto_id uuid,
  recinto_nombre text,
  candidato_id uuid,
  candidato_nombre text,
  dignidad public.dignidad_electoral,
  organizacion_id uuid,
  organizacion_codigo text,
  organizacion_nombre text,
  votos bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    recinto.id,
    recinto.nombre,
    candidato.id,
    candidato.nombre_completo,
    candidato.dignidad,
    organizacion.id,
    organizacion.codigo,
    organizacion.nombre,
    COALESCE(
      SUM(
        CASE
          WHEN pg_catalog.jsonb_typeof(acta.votos_organizaciones -> candidato.organizacion_id::text) = 'number'
            AND (acta.votos_organizaciones ->> candidato.organizacion_id::text) ~ '^[0-9]+$'
          THEN (acta.votos_organizaciones ->> candidato.organizacion_id::text)::bigint
          ELSE 0
        END
      ),
      0
    )::bigint
  FROM public.recintos AS recinto
  CROSS JOIN public.candidatos AS candidato
  JOIN public.organizaciones_politicas AS organizacion
    ON organizacion.id = candidato.organizacion_id
  LEFT JOIN public.jrv AS mesa
    ON mesa.recinto_id = recinto.id
  LEFT JOIN public.actas AS acta
    ON acta.jrv_id = mesa.id
    AND acta.dignidad = candidato.dignidad
  WHERE public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario
  GROUP BY
    recinto.id,
    recinto.nombre,
    candidato.id,
    candidato.nombre_completo,
    candidato.dignidad,
    organizacion.id,
    organizacion.codigo,
    organizacion.nombre
  ORDER BY recinto.nombre, candidato.dignidad, candidato.nombre_completo;
$$;

REVOKE ALL ON FUNCTION public.obtener_resumen_votos_provincial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_resumen_votos_provincial() TO authenticated;
