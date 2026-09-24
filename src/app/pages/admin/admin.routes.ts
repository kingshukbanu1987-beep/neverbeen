import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

/** Redirects to the Admin Console sign-in (/login) when not authenticated. */
const adminGuard: CanActivateFn = () => {
  const auth = inject(AdminAuthService);
  const router = inject(Router);
  return auth.isAuthed() ? true : router.createUrlTree(['/login']);
};

const underDevelopment = () =>
  import('./under-development/under-development').then((m) => m.AdminUnderDevelopment);

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      // Dashboard drill-down pages live under /admin/dashboard/* so "Dashboard" stays selected in the side panel.
      {
        path: 'dashboard/members/all',
        title: 'All Members — NeverBeen Admin',
        data: { mode: 'all' },
        loadComponent: () => import('./members/members').then((m) => m.AdminMembers),
      },
      {
        path: 'dashboard/members/verified',
        title: 'Verified Members — NeverBeen Admin',
        data: { mode: 'verified' },
        loadComponent: () => import('./members/members').then((m) => m.AdminMembers),
      },
      {
        path: 'dashboard/members/online',
        title: 'Online Now — NeverBeen Admin',
        data: { mode: 'online' },
        loadComponent: () => import('./members/members').then((m) => m.AdminMembers),
      },
      {
        path: 'dashboard/abuse-reports',
        title: 'Abuse Reports — NeverBeen Admin',
        loadComponent: () => import('./abuse-reports/abuse-reports').then((m) => m.AdminAbuseReports),
      },
      {
        path: 'dashboard',
        pathMatch: 'full',
        title: 'Dashboard — NeverBeen Admin',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.AdminDashboard),
      },
      { path: 'users', title: 'User Management — NeverBeen Admin', loadComponent: () => import('./users/users').then((m) => m.AdminUsers) },
      { path: 'data', title: 'Data Management — NeverBeen Admin', loadComponent: () => import('./data/data').then((m) => m.AdminData) },
      // Repositories is not built yet.
      { path: 'repositories', title: 'Repositories — NeverBeen Admin', data: { section: 'Repositories' }, loadComponent: underDevelopment },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
