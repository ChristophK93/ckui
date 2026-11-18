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
    ]),
  ],
}).catch((error) => console.error(error));
