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
    path: 'components/segmented',
    loadComponent: () =>
      import('./pages/components/segmented/segmented-page').then((module) => module.SegmentedPage),
    title: 'Segmented · ckui',
  },
  {
    path: 'components/toast',
    loadComponent: () =>
      import('./pages/components/toast/toast-page').then((module) => module.ToastPage),
    title: 'Toast · ckui',
  },
  {
    path: 'components/dialog',
    loadComponent: () =>
      import('./pages/components/dialog/dialog-page').then((module) => module.DialogPage),
    title: 'Dialog · ckui',
  },
  {
    path: 'components/badge',
    loadComponent: () =>
      import('./pages/components/badge/badge-page').then((module) => module.BadgePage),
    title: 'Badge · ckui',
  },
  {
    path: 'components/progress',
    loadComponent: () =>
      import('./pages/components/progress/progress-page').then((module) => module.ProgressPage),
    title: 'Progress · ckui',
  },
  {
    path: 'components/stepper',
    loadComponent: () =>
      import('./pages/components/stepper/stepper-page').then((module) => module.StepperPage),
    title: 'Stepper · ckui',
  },
  {
    path: 'tokens',
    loadComponent: () => import('./pages/tokens/tokens').then((module) => module.Tokens),
    title: 'Tokens · ckui',
  },
];
