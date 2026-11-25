import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { rutaPrincipalPorRol } from '../routing/role-route';
import { AuthService } from '../services/auth.service';

export const roleHomeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.esperarInicializacion();
  const perfil = auth.perfil();
  if (!auth.autenticado() || !perfil) {
    return router.parseUrl('/auth/login');
  }

  if (auth.debeCambiarPassword()) {
    return router.parseUrl('/auth/cambiar-password');
  }

  return router.parseUrl(rutaPrincipalPorRol(perfil.rol));
};
