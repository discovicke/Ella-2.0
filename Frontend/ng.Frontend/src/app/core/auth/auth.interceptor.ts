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

  // Hämta token från sessionen
  const token = sessionService.currentUser()?.token;

  // Lägg till Authorization header om vi har en token och anropet går mot /api
  let authReq = req;
  if (token && req.url.includes('/api')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token is invalid (expired, revoked via validafter, etc.)
        // Automatically log the user out to redirect to login
        authService.logout();
      }

      if (error.status === 403 && error.error?.code === 'USER_BANNED') {
        // TODO: Fixa toasten om man loggar in som bannad användare, det är fel text i den toasten för tillfället
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
