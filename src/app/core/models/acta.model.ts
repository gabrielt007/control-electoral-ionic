export type DignidadElectoral = 'ALCALDIA' | 'PREFECTURA';

export interface Acta {
  id: string;
  jrv_id: string;
  dignidad: DignidadElectoral;
  votos_organizaciones: Record<string, number>;
  blancos: number;
  nulos: number;
  total_sufragantes: number;
  foto_url: string | null;
  latitud: number | null;
  longitud: number | null;
  created_at: string;
  updated_at: string;
}
