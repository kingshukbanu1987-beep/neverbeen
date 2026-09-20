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
    path: 'feedback',
    loadComponent: () => import('./pages/feedback/feedback').then((m) => m.Feedback),
    title: 'Feedback & suggestions — NeverBeen',
  },
  {
    path: 'collection',
    loadComponent: () => import('./pages/collection/collection').then((m) => m.Collection),
    title: 'Collection — NeverBeen',
  },
  { path: '**', redirectTo: '' },
];
