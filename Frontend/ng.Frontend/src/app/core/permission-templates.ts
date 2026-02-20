import { signal } from '@angular/core';
import { Permission, PermissionTemplateDto } from '../models/models';

// ---------------------------------------------------------------
// Public types
// ---------------------------------------------------------------

/** Role labels derived from permission templates; 'Custom' when no template matches. */
export type RoleLabel = string; // dynamic labels from backend; 'Custom' as fallback

// ---------------------------------------------------------------
// Template store  (module-level signal so it's shared app-wide)
// ---------------------------------------------------------------

/** The loaded templates. Updated when the API responds. */
export const permissionTemplates = signal<PermissionTemplateDto[]>([]);

/**
 * Call once at app startup to seed the template store from the API.
 * Returns a Promise so it can be used in APP_INITIALIZER or similar.
 */
export async function initPermissionTemplates(): Promise<void> {
  try {
    const res = await fetch('/api/permission-templates');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: PermissionTemplateDto[] = await res.json();
    permissionTemplates.set(data);
  } catch (err) {
    console.warn('Could not load permission templates from API, using empty set.', err);
  }
}

// ---------------------------------------------------------------
// Resolver functions  (same signatures as before)
// ---------------------------------------------------------------

/**
 * Resolves a Permission object to a human-readable role label.
 * Uses template_id for fast lookup when available; falls back to flag matching.
 * Returns 'Custom' if the permissions don't match any template.
 */
export function resolveRoleLabel(permissions: Permission | undefined | null): string {
  if (!permissions) return 'Student'; // sensible default

  // Fast path: use stored template_id
  if (permissions.templateId) {
    const match = permissionTemplates().find((t) => t.id === permissions.templateId);
    if (match) return match.label ?? 'Custom';
  }

  // Fallback: pattern-match flags
  for (const tpl of permissionTemplates()) {
    if (tpl.permissions && permissionsMatch(permissions, tpl.permissions)) {
      return tpl.label ?? 'Custom';
    }
  }

  return 'Custom';
}

/**
 * Resolves a Permission object to the CSS class for badge styling.
 * Uses template_id for fast lookup when available; falls back to flag matching.
 */
export function resolveRoleCssClass(permissions: Permission | undefined | null): string {
  if (!permissions) return 'student';

  // Fast path: use stored template_id
  if (permissions.templateId) {
    const match = permissionTemplates().find((t) => t.id === permissions.templateId);
    if (match) return match.cssClass ?? 'custom';
  }

  // Fallback: pattern-match flags
  for (const tpl of permissionTemplates()) {
    if (tpl.permissions && permissionsMatch(permissions, tpl.permissions)) {
      return tpl.cssClass ?? 'custom';
    }
  }

  return 'custom';
}

/**
 * Returns a list of distinct role labels from the loaded templates.
 * Useful for filter dropdowns.
 */
export function getTemplateLabels(): string[] {
  return permissionTemplates().map((t) => t.label ?? 'Custom');
}

// ---------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------

/**
 * Compares a user's permission object against a template's
 * permission dictionary (snake_case keys from the backend).
 * Handles both boolean (true/false) and integer (1/0) values
 * from the API by coercing to boolean before comparison.
 */
function permissionsMatch(
  actual: NonNullable<Permission>,
  expected: Record<string, boolean>,
): boolean {
  // Build a camelCase → value map from the actual Permission object
  const actualMap: Record<string, boolean> = {
    book_room: !!actual.bookRoom,
    my_bookings: !!actual.myBookings,
    manage_users: !!actual.manageUsers,
    manage_classes: !!actual.manageClasses,
    manage_rooms: !!actual.manageRooms,
    manage_assets: !!actual.manageAssets,
    manage_bookings: !!actual.manageBookings,
    manage_campuses: !!actual.manageCampuses,
    manage_roles: !!actual.manageRoles,
  };

  // Check every key in the template
  for (const [key, value] of Object.entries(expected)) {
    const actualValue = actualMap[key] ?? false;
    // Coerce both sides to boolean to handle integer 1/0 from SQLite
    if (actualValue !== !!value) return false;
  }

  // If the actual object has permission keys NOT in the template, those must be false
  for (const [key, value] of Object.entries(actualMap)) {
    if (!(key in expected) && value) return false;
  }

  return true;
}
