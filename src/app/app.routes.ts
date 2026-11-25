import type { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';

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
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
