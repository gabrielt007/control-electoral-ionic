import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import type { RolUsuario } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';

export function roleGuard(rolesPermitidos: readonly RolUsuario[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    await auth.esperarInicializacion();
    const perfil = auth.perfil();
    if (!auth.autenticado() || !perfil) {
      return router.parseUrl('/home');
    }

    if (auth.debeCambiarPassword()) {
      return router.parseUrl('/auth/cambiar-password');
    }

    return rolesPermitidos.includes(perfil.rol) ? true : router.parseUrl('/home');
  };
}
