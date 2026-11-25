import type { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { passwordChangedGuard } from './core/guards/password-changed.guard';
import { roleHomeGuard } from './core/guards/role-home.guard';
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
    canActivate: [roleHomeGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'veedor',
    pathMatch: 'full',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['VEEDOR'])],
    loadComponent: () => import('./features/veedor/pages/lista-jrv.page').then((m) => m.ListaJrvPage),
  },
  {
    path: 'veedor/jrv/:jrvId/acta/:dignidad',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['VEEDOR'])],
    loadComponent: () => import('./features/veedor/pages/acta.page').then((m) => m.ActaPage),
  },
  {
    path: 'recinto',
    pathMatch: 'full',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['RECINTO'])],
    loadComponent: () => import('./features/recinto/pages/panel.page').then((m) => m.PanelRecintoPage),
  },
  {
    path: 'recinto/veedores/nuevo',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['RECINTO'])],
    loadComponent: () => import('./features/recinto/pages/crear-veedor.page').then((m) => m.CrearVeedorPage),
  },
  {
    path: 'recinto/jrv/:jrvId/acta/:dignidad',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['RECINTO'])],
    loadComponent: () => import('./features/recinto/pages/acta.page').then((m) => m.ActaRecintoPage),
  },
  {
    path: 'provincial',
    pathMatch: 'full',
    redirectTo: 'provincial/recintos',
  },
  {
    path: 'provincial/recintos',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['PROVINCIAL'])],
    loadComponent: () => import('./features/provincial/pages/recintos.page').then((m) => m.RecintosPage),
  },
  {
    path: 'provincial/votos',
    canActivate: [authGuard, passwordChangedGuard, roleGuard(['PROVINCIAL'])],
    loadComponent: () => import('./features/provincial/pages/votos.page').then((m) => m.VotosProvincialPage),
  },
  {
    path: '',
    canActivate: [roleHomeGuard],
    pathMatch: 'full',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '**',
    canActivate: [roleHomeGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
];
