import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';
import { Founder } from './pages/founder/founder';

export const routes: Routes = [
  { path: '', component: Home, title: 'NeverBeen — Vacation photographs of places you have never been' },
  { path: 'login', component: Login, title: 'Login — NeverBeen' },
  { path: 'founder', component: Founder, title: 'Founder — NeverBeen' },
  {
    path: 'audience',
    loadComponent: () => import('./pages/audience/audience').then((m) => m.Audience),
    title: 'Audience — NeverBeen',
  },
  { path: '**', redirectTo: '' },
];
