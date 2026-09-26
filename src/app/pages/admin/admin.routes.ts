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
    loadComponent: () => import('./identity-checks/identity-document').then((m) => m.AdminIdentityDocument),
  },
  // Print-ready Website Health report (opened in a new tab → Save as PDF).
  {
    path: 'health-report',
    canActivate: [adminGuard],
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
        data: { mode: 'all' },
        loadComponent: () => import('./members/members').then((m) => m.AdminMembers),
      },
      {
        path: 'dashboard/members/verified',
        data: { mode: 'verified' },
        loadComponent: () => import('./members/members').then((m) => m.AdminMembers),
      },
      {
        path: 'dashboard/members/online',
        data: { mode: 'online' },
        loadComponent: () => import('./members/members').then((m) => m.AdminMembers),
      },
      {
        path: 'dashboard/abuse-reports',
        loadComponent: () => import('./abuse-reports/abuse-reports').then((m) => m.AdminAbuseReports),
      },
      {
        path: 'dashboard/identity-checks',
        loadComponent: () => import('./identity-checks/identity-checks').then((m) => m.AdminIdentityChecks),
      },
      {
        path: 'dashboard',
        pathMatch: 'full',
        loadComponent: () => import('./dashboard/dashboard').then((m) => m.AdminDashboard),
      },
      // Admin Mail — private messages between administrators (side panel → Mail).
      { path: 'mail', pathMatch: 'full', redirectTo: 'mail/inbox' },
      {
        path: 'mail/inbox',
        data: { folder: 'inbox' },
        loadComponent: () => import('./mail/mail-folder').then((m) => m.AdminMailFolder),
      },
      {
        path: 'mail/sent',
        data: { folder: 'sent' },
        loadComponent: () => import('./mail/mail-folder').then((m) => m.AdminMailFolder),
      },
      {
        path: 'mail/compose',
        loadComponent: () => import('./mail/mail-compose').then((m) => m.AdminMailCompose),
      },
      // Announcements published to all / targeted users (side panel → Announcement, after Mail).
      {
        path: 'announcements',
        pathMatch: 'full',
        loadComponent: () => import('./announcements/announcements').then((m) => m.AdminAnnouncements),
      },
      {
        path: 'announcements/new',
        loadComponent: () => import('./announcements/announcement-composer').then((m) => m.AdminAnnouncementComposer),
      },
      // WhatsApp Web (opens docked over the wide panel; linked by scanning the QR code).
      { path: 'whatsapp', loadComponent: () => import('./whatsapp/whatsapp').then((m) => m.AdminWhatsApp) },
      { path: 'users', loadComponent: () => import('./users/users').then((m) => m.AdminUsers) },
      { path: 'data', loadComponent: () => import('./data/data').then((m) => m.AdminData) },
      { path: 'website', loadComponent: () => import('./website/website').then((m) => m.AdminWebsite) },
      { path: 'maintenance', loadComponent: () => import('./maintenance/maintenance').then((m) => m.AdminMaintenance) },
      { path: 'health', loadComponent: () => import('./health/health').then((m) => m.AdminHealth) },
      // Repositories is not built yet.
      { path: 'repositories', data: { section: 'Repositories' }, loadComponent: underDevelopment },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
