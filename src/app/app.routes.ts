import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Login } from './pages/login/login';

export const routes: Routes = [
  { path: '', component: Home, title: 'NeverBeen — Vacation photographs of places you have never been' },
  { path: 'login', component: Login, title: 'Login — NeverBeen' },
  { path: '**', redirectTo: '' },
];
