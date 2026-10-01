import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Founder } from './pages/founder/founder';

export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  { path: 'login', component: Login },
  {
    path: 'admin',
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.adminRoutes),
  },
  { path: 'founder', component: Founder },
  {
    path: 'audience',
    loadComponent: () => import('./pages/audience/audience').then((m) => m.Audience),
  },
  {
    path: 'destinations/:slug',
    loadComponent: () =>
      import('./pages/destination/destination').then((m) => m.DestinationPageView),
  },
  {
    path: 'travel-feeds',
    loadComponent: () => import('./pages/travel-feeds/travel-feeds').then((m) => m.TravelFeedsPage),
  },
  {
    path: 'feedback',
    loadComponent: () => import('./pages/feedback/feedback').then((m) => m.Feedback),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/privacy/privacy').then((m) => m.PrivacyPage),
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/terms/terms').then((m) => m.TermsPage),
  },
  {
    path: 'help',
    loadComponent: () => import('./pages/help/help').then((m) => m.HelpPage),
  },
  {
    path: 'collection',
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
  },
  {
    path: 'documentation',
    loadComponent: () =>
      import('./pages/documentation/documentation').then((m) => m.DocumentationPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/community/profile/profile').then((m) => m.CommunityProfile),
  },
  {
    path: 'community',
    loadComponent: () => import('./pages/community/community').then((m) => m.CommunityHub),
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/community/connect/connect').then((m) => m.CommunityConnect),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/community/register/register').then((m) => m.CommunityRegister),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/community/profile/profile').then((m) => m.CommunityProfile),
      },
      {
        path: 'message-book',
        loadComponent: () =>
          import('./pages/community/message-book/message-book').then((m) => m.CommunityMessageBook),
      },
      {
        path: 'messages',
        redirectTo: 'message-book',
        pathMatch: 'full',
      },
      {
        path: 'callback',
        loadComponent: () => import('./pages/community/callback/callback').then((m) => m.CommunityCallback),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
