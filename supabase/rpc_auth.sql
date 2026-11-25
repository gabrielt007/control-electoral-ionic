CREATE OR REPLACE FUNCTION public.obtener_correo_por_cedula(p_cedula text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT usuario.email
  FROM auth.users AS usuario
  JOIN public.perfiles_usuario AS perfil
    ON perfil.id = usuario.id
  WHERE perfil.cedula = p_cedula;
$$;

REVOKE ALL ON FUNCTION public.obtener_correo_por_cedula(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obtener_correo_por_cedula(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.marcar_password_cambiada()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.perfiles_usuario
  SET debe_cambiar_password = false
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el perfil del usuario autenticado.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_password_cambiada() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marcar_password_cambiada() FROM anon;
GRANT EXECUTE ON FUNCTION public.marcar_password_cambiada() TO authenticated;
