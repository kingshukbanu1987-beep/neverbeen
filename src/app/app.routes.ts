import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Founder } from './pages/founder/founder';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'NeverBeen — Vacation photographs of places you have never been',
  },
  { path: 'login', component: Login, title: 'Login — NeverBeen' },
  { path: 'founder', component: Founder, title: 'Founder — NeverBeen' },
  {
    path: 'audience',
    loadComponent: () => import('./pages/audience/audience').then((m) => m.Audience),
    title: 'Audience — NeverBeen',
  },
  {
    path: 'destinations/:slug',
    loadComponent: () =>
      import('./pages/destination/destination').then((m) => m.DestinationPageView),
    title: 'Destination guide — NeverBeen',
  },
  {
    path: 'travel-feeds',
    loadComponent: () => import('./pages/travel-feeds/travel-feeds').then((m) => m.TravelFeedsPage),
    title: 'Trending Destinations News — NeverBeen',
  },
  {
    path: 'feedback',
    loadComponent: () => import('./pages/feedback/feedback').then((m) => m.Feedback),
    title: 'Feedback & suggestions — NeverBeen',
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/legal/privacy/privacy').then((m) => m.PrivacyPage),
    title: 'Privacy Policy — NeverBeen',
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/legal/terms/terms').then((m) => m.TermsPage),
    title: 'Terms & Condition — NeverBeen',
  },
  {
    path: 'help',
    loadComponent: () => import('./pages/help/help').then((m) => m.HelpPage),
    title: 'Help Centre — NeverBeen',
  },
  {
    path: 'collection',
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
    title: 'Collection — NeverBeen',
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/community/profile/profile').then((m) => m.CommunityProfile),
    title: 'User Profile — NeverBeen Community',
  },
  {
    path: 'community',
    loadComponent: () => import('./pages/community/community').then((m) => m.CommunityHub),
    title: 'Community — NeverBeen',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/community/connect/connect').then((m) => m.CommunityConnect),
        title: 'Connect — NeverBeen Community',
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/community/register/register').then((m) => m.CommunityRegister),
        title: 'Register Profile — NeverBeen Community',
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/community/profile/profile').then((m) => m.CommunityProfile),
        title: 'Member Profile — NeverBeen Community',
      },
      {
        path: 'message-book',
        loadComponent: () =>
          import('./pages/community/message-book/message-book').then((m) => m.CommunityMessageBook),
        title: 'Message Book — NeverBeen Community',
      },
      {
        path: 'messages',
        redirectTo: 'message-book',
        pathMatch: 'full',
      },
      {
        path: 'callback',
        loadComponent: () => import('./pages/community/callback/callback').then((m) => m.CommunityCallback),
        title: 'OAuth Verification — NeverBeen Community',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
