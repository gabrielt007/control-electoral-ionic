import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const passwordChangedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.esperarInicializacion();
  if (!auth.autenticado() || !auth.perfil()) {
    return router.parseUrl('/home');
  }

  if (auth.debeCambiarPassword()) {
    return router.parseUrl('/auth/cambiar-password');
  }

  return true;
};
