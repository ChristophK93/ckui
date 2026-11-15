import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'ckui' },
  {
    path: 'theming',
    loadComponent: () => import('./pages/theming/theming').then((module) => module.Theming),
    title: 'Theming · ckui',
  },
  {
    path: 'components/button',
    loadComponent: () =>
      import('./pages/components/button/button-page').then((module) => module.ButtonPage),
    title: 'Button · ckui',
  },
  {
    path: 'components/field',
    loadComponent: () =>
      import('./pages/components/field/field-page').then((module) => module.FieldPage),
    title: 'Field · ckui',
  },
  {
    path: 'tokens',
    loadComponent: () => import('./pages/tokens/tokens').then((module) => module.Tokens),
    title: 'Tokens · ckui',
  },
];
