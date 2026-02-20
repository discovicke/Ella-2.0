import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionService } from '../session.service';

/**
 * Route guard that requires the user to hold **at least one** admin-level
 * permission (manageUsers, manageRooms, manageBookings, manageRoles,
 * manageAssets, manageClasses, manageCampuses).
 *
 * Use this for pages like "System Overview" that aren't tied to a single
 * permission but should be hidden from regular students.
 *
 * Redirects to `/forbidden` when the check fails.
 */
export const adminGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  const perms = session.permissions();
  const hasAny = !!(
    perms?.manageUsers ||
    perms?.manageRooms ||
    perms?.manageBookings ||
    perms?.manageRoles ||
    perms?.manageAssets ||
    perms?.manageClasses ||
    perms?.manageCampuses
  );

  if (hasAny) return true;

  console.warn('adminGuard: user has no admin permissions – redirecting to /forbidden');
  return router.createUrlTree(['/forbidden']);
};
