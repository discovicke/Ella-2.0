import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';

/**
 * Route guard that checks whether the current user has the permission
 * specified in `route.data['permission']`.
 *
 * Usage in route config:
 * ```ts
 * {
 *   path: 'manage-users',
 *   canActivate: [adminGuard],
 *   // optional: customize check
 * }
 * ```
 *
 * This guard ensures the user has AT LEAST ONE admin-level
 * permission (manageUsers, manageRooms, manageBookings, manageRoles,
 * manageAssets, manageClasses, manageCampuses).
 *
 * Useful for "System" menu items that don't map to a single
 * permission but should be hidden from regular students.
 */
export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  const perms = session.permissions();

  if (!perms) {
    return router.createUrlTree(['/forbidden']);
  }

  const hasAnyAdminPerm =
    perms.manageUsers ||
    perms.manageRooms ||
    perms.manageBookings ||
    perms.manageRoles ||
    perms.manageAssets ||
    perms.manageClasses ||
    perms.manageCampuses;

  if (hasAnyAdminPerm) {
    return true;
  }

  console.warn('adminGuard: user has no admin permissions – redirecting to /forbidden');
  return router.createUrlTree(['/forbidden']);
};
