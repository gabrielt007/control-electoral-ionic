export type RolUsuario = 'PROVINCIAL' | 'RECINTO' | 'VEEDOR';

export interface Usuario {
  id: string;
  cedula: string;
  rol: RolUsuario;
  debe_cambiar_password: boolean;
  recinto_id: string | null;
  created_at: string;
}
