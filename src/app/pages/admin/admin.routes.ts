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
  // Secure full-page viewer for a submitted identity document (opened in a new tab from the grid).
  {
    path: 'identity-document/:submissionId/:fileId',
    canActivate: [adminGuard],
    title: 'Identity Document — NeverBeen Admin',
    loadComponent: () => import('./identity-checks/identity-document').then((m) => m.AdminIdentityDocument),
  },
  // Print-ready Website Health report (opened in a new tab → Save as PDF).
  {
    path: 'health-report',
    canActivate: [adminGuard],
    title: 'Website Health Report — NeverBeen',
    loadComponent: () => import('./health/health-report').then((m) => m.AdminHealthReport),
  },
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
        path: 'dashboard/identity-checks',
        title: 'Identity Check Verification — NeverBeen Admin',
        loadComponent: () => import('./identity-checks/identity-checks').then((m) => m.AdminIdentityChecks),
      },
      {
        path: 'dashboard',
        pathMatch: 'full',
        title: 'Dashboard — NeverBeen Admin',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.AdminDashboard),
      },
      { path: 'users', title: 'User Management — NeverBeen Admin', loadComponent: () => import('./users/users').then((m) => m.AdminUsers) },
      { path: 'data', title: 'Data Management — NeverBeen Admin', loadComponent: () => import('./data/data').then((m) => m.AdminData) },
      { path: 'website', title: 'Website Management — NeverBeen Admin', loadComponent: () => import('./website/website').then((m) => m.AdminWebsite) },
      { path: 'maintenance', title: 'Site Downtime — NeverBeen Admin', loadComponent: () => import('./maintenance/maintenance').then((m) => m.AdminMaintenance) },
      { path: 'health', title: 'Website Health — NeverBeen Admin', loadComponent: () => import('./health/health').then((m) => m.AdminHealth) },
      // Repositories is not built yet.
      { path: 'repositories', title: 'Repositories — NeverBeen Admin', data: { section: 'Repositories' }, loadComponent: underDevelopment },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
