import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { UserRole } from '../../api/models';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('AuthGuard: checking access to', state.url);

  if (!authService.isAuthenticated()) {
    console.log('AuthGuard: not authenticated, redirecting to login');
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  // Check for required roles
  const requiredRoles = route.data['roles'] as UserRole[];
  if (requiredRoles && requiredRoles.length > 0) {
    if (!authService.hasRole(requiredRoles)) {
      console.log('AuthGuard: forbidden, missing required roles');
      // User is logged in but doesn't have the right role
      return router.createUrlTree(['/forbidden']);
    }
  }

  console.log('AuthGuard: access granted');
  return true;
};
