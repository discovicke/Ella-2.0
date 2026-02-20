import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';
import { Permission } from '../../models/models';

/**
 * Route guard that checks whether the current user has the permission
 * specified in `route.data['permission']`.
 *
 * Usage in route config:
 * ```ts
 * {
 *   path: 'manage-users',
 *   canActivate: [permissionGuard],
 *   data: { permission: 'manageUsers' },
 *   loadComponent: () => …
 * }
 * ```
 *
 * If the permission key is missing from route data the guard denies access.
 * Redirects to `/forbidden` when the user lacks the required permission.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const session = inject(SessionService);
  const router = inject(Router);

  const requiredPermission = route.data?.['permission'] as
    | keyof NonNullable<Permission>
    | undefined;

  if (!requiredPermission) {
    console.warn('permissionGuard: no permission key set in route data – access denied');
    return router.createUrlTree(['/forbidden']);
  }

  if (session.hasPermission(requiredPermission)) {
    return true;
  }

  console.warn(`permissionGuard: user lacks "${requiredPermission}" – redirecting to /forbidden`);
  return router.createUrlTree(['/forbidden']);
};
