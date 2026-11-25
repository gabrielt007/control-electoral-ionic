-- Funciones auxiliares seguras para consultar rol y recinto del usuario autenticado
CREATE OR REPLACE FUNCTION public.obtener_rol_actual()
RETURNS public.rol_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT rol
  FROM public.perfiles_usuario
  WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.obtener_recinto_actual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT recinto_id
  FROM public.perfiles_usuario
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.obtener_rol_actual() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.obtener_recinto_actual() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_rol_actual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_recinto_actual() TO authenticated;

-- Permisos de escritura necesarios para roles de gestión
GRANT INSERT, UPDATE ON public.recintos TO authenticated;
GRANT INSERT, UPDATE ON public.jrv TO authenticated;
GRANT INSERT, UPDATE ON public.perfiles_usuario TO authenticated;

-- PERFILES DE USUARIO
CREATE POLICY perfiles_provincial_lee_todos
  ON public.perfiles_usuario
  FOR SELECT
  TO authenticated
  USING (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

CREATE POLICY perfiles_recinto_lee_de_su_recinto
  ON public.perfiles_usuario
  FOR SELECT
  TO authenticated
  USING (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
  );

CREATE POLICY perfiles_provincial_crea_coordinadores
  ON public.perfiles_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario
    AND rol = 'RECINTO'::public.rol_usuario
  );

CREATE POLICY perfiles_recinto_crea_veedores
  ON public.perfiles_usuario
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND rol = 'VEEDOR'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
  );

CREATE POLICY perfiles_provincial_actualiza
  ON public.perfiles_usuario
  FOR UPDATE
  TO authenticated
  USING (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario)
  WITH CHECK (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

CREATE POLICY perfiles_recinto_actualiza_veedores
  ON public.perfiles_usuario
  FOR UPDATE
  TO authenticated
  USING (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND rol = 'VEEDOR'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
  )
  WITH CHECK (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND rol = 'VEEDOR'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
  );

CREATE POLICY perfiles_usuario_actualiza_propio
  ON public.perfiles_usuario
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RECINTOS
CREATE POLICY recintos_provincial_inserta
  ON public.recintos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

CREATE POLICY recintos_provincial_actualiza
  ON public.recintos
  FOR UPDATE
  TO authenticated
  USING (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario)
  WITH CHECK (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

-- JRV (MESAS)
CREATE POLICY jrv_provincial_lee_todas
  ON public.jrv
  FOR SELECT
  TO authenticated
  USING (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

CREATE POLICY jrv_recinto_lee_suyas
  ON public.jrv
  FOR SELECT
  TO authenticated
  USING (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND recinto_id = public.obtener_recinto_actual()
  );

CREATE POLICY jrv_provincial_gestiona
  ON public.jrv
  FOR ALL
  TO authenticated
  USING (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario)
  WITH CHECK (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

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
  );

-- ACTAS
CREATE POLICY actas_provincial_lee_todas
  ON public.actas
  FOR SELECT
  TO authenticated
  USING (public.obtener_rol_actual() = 'PROVINCIAL'::public.rol_usuario);

CREATE POLICY actas_recinto_lee_y_corrige_su_recinto
  ON public.actas
  FOR ALL
  TO authenticated
  USING (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND EXISTS (
      SELECT 1
      FROM public.jrv AS j
      WHERE j.id = jrv_id
        AND j.recinto_id = public.obtener_recinto_actual()
    )
  )
  WITH CHECK (
    public.obtener_rol_actual() = 'RECINTO'::public.rol_usuario
    AND EXISTS (
      SELECT 1
      FROM public.jrv AS j
      WHERE j.id = jrv_id
        AND j.recinto_id = public.obtener_recinto_actual()
    )
  );