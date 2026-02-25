import { signal } from '@angular/core';
import { UserPermissions, PermissionTemplateDto } from '../models/models';

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
 * Uses template_id for fast lookup when available.
 * Returns 'Custom' if the permissions don't have a template ID.
 */
export function resolveRoleLabel(permissions: UserPermissions | undefined | null): string {
  if (!permissions) return 'Student'; // sensible default

  // Use stored template_id
  if (permissions.permissionTemplateId) {
    const match = permissionTemplates().find((t) => t.id === permissions.permissionTemplateId);
    if (match) return match.label ?? 'Custom';
  }

  return 'Custom';
}

/**
 * Resolves a Permission object to the CSS class for badge styling.
 * Uses template_id for fast lookup when available.
 */
export function resolveRoleCssClass(permissions: UserPermissions | undefined | null): string {
  if (!permissions) return 'green';

  // Use stored template_id
  if (permissions.permissionTemplateId) {
    const match = permissionTemplates().find((t) => t.id === permissions.permissionTemplateId);
    if (match) return match.cssClass ?? 'gray';
  }

  return 'gray';
}

/**
 * Returns a list of distinct role labels from the loaded templates.
 * Useful for filter dropdowns.
 */
export function getTemplateLabels(): string[] {
  return permissionTemplates().map((t) => t.label ?? 'Custom');
}
