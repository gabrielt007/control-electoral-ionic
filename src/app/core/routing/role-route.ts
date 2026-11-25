import type { RolUsuario } from '../models/usuario.model';

const RUTAS_PRINCIPALES: Record<RolUsuario, string> = {
  PROVINCIAL: '/provincial/recintos',
  RECINTO: '/recinto',
  VEEDOR: '/veedor',
};

export function rutaPrincipalPorRol(rol: RolUsuario): string {
  return RUTAS_PRINCIPALES[rol];
}
