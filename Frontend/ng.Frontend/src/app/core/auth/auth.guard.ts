import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (!sessionService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // Check if user is banned
  if (sessionService.currentUser()?.isBanned) {
    return router.createUrlTree(['/banned']);
  }

  return true;
};
