import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideCkui } from '@ckui/core';
import { App } from './app';

bootstrapApplication(App, {
  providers: [
    provideCkui(),
    provideRouter([
      {
        path: 'dialog',
        loadComponent: () => import('./dialog-page').then((module) => module.DialogPage),
      },
      {
        path: 'drawer',
        loadComponent: () => import('./drawer-page').then((module) => module.DrawerPage),
      },
    ]),
  ],
}).catch((error) => console.error(error));
