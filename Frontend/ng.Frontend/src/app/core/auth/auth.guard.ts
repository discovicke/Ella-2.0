import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../../models/models';
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

  // Check for required roles
  const requiredRoles = route.data['roles'] as UserRole[];
  if (requiredRoles && requiredRoles.length > 0) {
    if (!sessionService.hasRole(requiredRoles)) {
      console.log('AuthGuard: forbidden, missing required roles');
      // User is logged in but doesn't have the right role
      return router.createUrlTree(['/forbidden']);
    }
  }

  console.log('AuthGuard: access granted');
  return true;
};
