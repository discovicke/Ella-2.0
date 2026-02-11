import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  // Note: We no longer manually attach the Authorization header.
  // We rely on the HttpOnly cookie ('auth_token') sent by the backend.
  // The browser automatically attaches this cookie to same-origin requests (proxied via /api).

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token is invalid (expired, revoked via validafter, etc.)
        // Automatically log the user out to redirect to login
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
