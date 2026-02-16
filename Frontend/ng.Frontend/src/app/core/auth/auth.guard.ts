import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';

export const authGuard: CanActivateFn = (route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  console.log('AuthGuard: checking access to', state.url);

  if (!sessionService.isAuthenticated()) {
    console.log('AuthGuard: not authenticated, redirecting to login');
    return router.createUrlTree(['/login']);
  }

  // Check if user is banned
  if (sessionService.currentUser()?.isBanned) {
    console.log('AuthGuard: user is banned, redirecting to /banned');
    return router.createUrlTree(['/banned']);
  }

  // Role checks are removed as per new permission-based architecture plan.
  // Access is granted if authenticated.

  console.log('AuthGuard: access granted');
  return true;
};
