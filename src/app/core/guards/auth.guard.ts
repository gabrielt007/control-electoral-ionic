import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.esperarInicializacion();
  if (auth.autenticado() && auth.perfil()) {
    return true;
  }

  return router.createUrlTree(['/home'], {
    queryParams: { returnUrl: state.url },
  });
};
