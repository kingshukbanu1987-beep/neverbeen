import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

/** Redirects to the Admin Console sign-in (/login) when not authenticated. */
const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isAuthed() ? true : router.createUrlTree(['/login']);
};

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard — NeverBeen Admin',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.AdminDashboard),
      },
      {
        path: 'repositories',
        title: 'Repositories — NeverBeen Admin',
        loadComponent: () => import('./repositories/repositories').then((m) => m.AdminRepositories),
      },
      {
        path: 'users',
        title: 'Users — NeverBeen Admin',
        loadComponent: () => import('./users/users').then((m) => m.AdminUsers),
      },
      {
        path: 'data',
        title: 'Data — NeverBeen Admin',
        loadComponent: () => import('./data/data').then((m) => m.AdminData),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
