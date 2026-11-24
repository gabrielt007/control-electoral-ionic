INSERT INTO public.recintos (
  provincia,
  canton,
  parroquia,
  nombre,
  cantidad_jrv
)
VALUES (
  'Pichincha',
  'Quito',
  'Parroquia Demostrativa',
  'Recinto Electoral Demostrativo',
  5
)
ON CONFLICT (provincia, canton, parroquia, nombre)
DO UPDATE SET cantidad_jrv = EXCLUDED.cantidad_jrv;

INSERT INTO public.organizaciones_politicas (codigo, nombre)
VALUES
  ('ORG-DEMO-01', 'Organizacion Demostrativa 01'),
  ('ORG-DEMO-02', 'Organizacion Demostrativa 02'),
  ('ORG-DEMO-03', 'Organizacion Demostrativa 03'),
  ('ORG-DEMO-04', 'Organizacion Demostrativa 04'),
  ('ORG-DEMO-05', 'Organizacion Demostrativa 05')
ON CONFLICT (codigo)
DO UPDATE SET nombre = EXCLUDED.nombre;

INSERT INTO public.candidatos (
  codigo,
  organizacion_id,
  nombre_completo,
  dignidad
)
SELECT
  organizacion.codigo || '-ALC',
  organizacion.id,
  'Candidatura demostrativa ' || right(organizacion.codigo, 2) || ' - Alcaldia',
  'ALCALDIA'::public.dignidad_electoral
FROM public.organizaciones_politicas AS organizacion
WHERE organizacion.codigo LIKE 'ORG-DEMO-%'
ON CONFLICT (codigo)
DO UPDATE SET
  organizacion_id = EXCLUDED.organizacion_id,
  nombre_completo = EXCLUDED.nombre_completo,
  dignidad = EXCLUDED.dignidad;

INSERT INTO public.candidatos (
  codigo,
  organizacion_id,
  nombre_completo,
  dignidad
)
SELECT
  organizacion.codigo || '-PRE',
  organizacion.id,
  'Candidatura demostrativa ' || right(organizacion.codigo, 2) || ' - Prefectura',
  'PREFECTURA'::public.dignidad_electoral
FROM public.organizaciones_politicas AS organizacion
WHERE organizacion.codigo LIKE 'ORG-DEMO-%'
ON CONFLICT (codigo)
DO UPDATE SET
  organizacion_id = EXCLUDED.organizacion_id,
  nombre_completo = EXCLUDED.nombre_completo,
  dignidad = EXCLUDED.dignidad;
