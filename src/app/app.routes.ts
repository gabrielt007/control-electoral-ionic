import type { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { passwordChangedGuard } from './core/guards/password-changed.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'auth/cambiar-password',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/pages/cambiar-password.page').then((m) => m.CambiarPasswordPage),
  },
  {
    path: 'auth/recuperar-password',
    loadComponent: () => import('./features/auth/pages/recuperar-password.page').then((m) => m.RecuperarPasswordPage),
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'veedor',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['VEEDOR'])],
    loadComponent: () => import('./features/veedor/pages/lista-jrv.page').then((m) => m.ListaJrvPage),
  },
  {
    path: 'veedor/jrv/:jrvId/acta/:dignidad',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['VEEDOR'])],
    loadComponent: () => import('./features/veedor/pages/acta.page').then((m) => m.ActaPage),
  },
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
