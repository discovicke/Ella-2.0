import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeSv from '@angular/common/locales/sv';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { initPermissionTemplates } from './core/permission-templates';
import { AuthService } from './core/auth/auth.service';
import { SessionService } from './core/session.service';

registerLocaleData(localeSv);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: LOCALE_ID, useValue: 'sv' },
    provideAppInitializer(() => initPermissionTemplates()),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      const sessionService = inject(SessionService);
      return sessionService.isAuthenticated() ? authService.refreshCurrentUser() : Promise.resolve();
    }),
  ],
};
