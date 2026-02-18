import {
  APP_INITIALIZER,
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeSv from '@angular/common/locales/sv';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { initPermissionTemplates } from './core/permission-templates';

registerLocaleData(localeSv);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'sv' },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => initPermissionTemplates(),
      multi: true,
    },
  ],
};
