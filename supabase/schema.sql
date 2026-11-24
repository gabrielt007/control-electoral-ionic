CREATE TYPE public.rol_usuario AS ENUM (
  'PROVINCIAL',
  'RECINTO',
  'VEEDOR'
);

CREATE TYPE public.dignidad_electoral AS ENUM (
  'ALCALDIA',
  'PREFECTURA'
);

CREATE TABLE public.recintos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provincia text NOT NULL,
  canton text NOT NULL,
  parroquia text NOT NULL,
  nombre text NOT NULL,
  cantidad_jrv integer NOT NULL CHECK (cantidad_jrv > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recintos_ubicacion_nombre_key
    UNIQUE (provincia, canton, parroquia, nombre)
);

CREATE TABLE public.perfiles_usuario (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  cedula text NOT NULL UNIQUE CHECK (cedula ~ '^[0-9]{10}$'),
  rol public.rol_usuario NOT NULL,
  debe_cambiar_password boolean NOT NULL DEFAULT true,
  recinto_id uuid REFERENCES public.recintos (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organizaciones_politicas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  organizacion_id uuid NOT NULL
    REFERENCES public.organizaciones_politicas (id) ON DELETE RESTRICT,
  nombre_completo text NOT NULL,
  dignidad public.dignidad_electoral NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidatos_organizacion_dignidad_key
    UNIQUE (organizacion_id, dignidad)
);

CREATE TABLE public.jrv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recinto_id uuid NOT NULL
    REFERENCES public.recintos (id) ON DELETE RESTRICT,
  numero_mesa integer NOT NULL CHECK (numero_mesa > 0),
  veedor_id uuid REFERENCES public.perfiles_usuario (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jrv_recinto_numero_mesa_key UNIQUE (recinto_id, numero_mesa)
);

CREATE TABLE public.actas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jrv_id uuid NOT NULL REFERENCES public.jrv (id) ON DELETE RESTRICT,
  dignidad public.dignidad_electoral NOT NULL,
  votos_organizaciones jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(votos_organizaciones) = 'object'),
  blancos integer NOT NULL DEFAULT 0 CHECK (blancos >= 0),
  nulos integer NOT NULL DEFAULT 0 CHECK (nulos >= 0),
  total_sufragantes integer NOT NULL CHECK (total_sufragantes >= 0),
  foto_url text,
  latitud double precision CHECK (latitud BETWEEN -90 AND 90),
  longitud double precision CHECK (longitud BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actas_jrv_dignidad_key UNIQUE (jrv_id, dignidad),
  CONSTRAINT actas_coordenadas_completas
    CHECK ((latitud IS NULL) = (longitud IS NULL))
);

CREATE FUNCTION public.veedor_tiene_jrv(p_jrv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jrv AS mesa
    JOIN public.perfiles_usuario AS perfil
      ON perfil.id = mesa.veedor_id
    WHERE mesa.id = p_jrv_id
      AND mesa.veedor_id = auth.uid()
      AND perfil.rol = 'VEEDOR'::public.rol_usuario
  );
$$;

REVOKE ALL ON FUNCTION public.veedor_tiene_jrv(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.veedor_tiene_jrv(uuid) TO authenticated;

GRANT SELECT ON
  public.perfiles_usuario,
  public.recintos,
  public.organizaciones_politicas,
  public.candidatos,
  public.jrv
TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.actas TO authenticated;

ALTER TABLE public.perfiles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recintos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizaciones_politicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jrv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actas FORCE ROW LEVEL SECURITY;

CREATE POLICY perfiles_usuario_lee_su_perfil
  ON public.perfiles_usuario
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY recintos_lectura_autenticada
  ON public.recintos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY organizaciones_lectura_autenticada
  ON public.organizaciones_politicas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY candidatos_lectura_autenticada
  ON public.candidatos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY jrv_veedor_lee_solo_asignadas
  ON public.jrv
  FOR SELECT
  TO authenticated
  USING (public.veedor_tiene_jrv(id));

CREATE POLICY actas_veedor_solo_jrv_asignadas
  ON public.actas
  FOR ALL
  TO authenticated
  USING (public.veedor_tiene_jrv(jrv_id))
  WITH CHECK (public.veedor_tiene_jrv(jrv_id));
