import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../session.service';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const sessionService = inject(SessionService);
  const router = inject(Router);

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

      if (error.status === 403 && error.error?.code === 'USER_BANNED') {
        // Update session so Guard knows for future navigations
        if (error.error.user) {
          sessionService.setUser(authService.mapToUserState(error.error.user));
        } else {
          // Fallback: just update the existing state if we have one
          const current = sessionService.currentUser();
          if (current) {
            sessionService.setUser({ ...current, isBanned: true });
          }
        }
        
        // User is banned - redirect to the banned page
        router.navigate(['/banned']);
      }

      return throwError(() => error);
    })
  );
};
