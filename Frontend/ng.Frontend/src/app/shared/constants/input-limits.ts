/**
 * Auto-generated from the OpenAPI spec — DO NOT EDIT manually.
 * Generated: 2026-03-02 16:46:18
 *
 * Source of truth: [MaxLength] attributes on C# DTOs →
 *   Backend/app/Core/Validation/InputLimits.cs
 *
 * Re-generate: npm run refresh:models  (or npm run api:sync)
 */

export const INPUT_LIMITS = {
  CreateAssetTypeDto: { description: 100 },
  CreateBookingDto: { bookerName: 100, notes: 500 },
  CreateCampusDto: { city: 100, contact: 150, country: 100, street: 150, zip: 20 },
  CreateClassDto: { className: 100 },
  CreatePublicBookingDto: { bookerName: 100, notes: 500 },
  CreateRoomDto: { floor: 20, name: 100, notes: 200 },
  CreateUserDto: { displayName: 100, email: 254, password: 128 },
  LoginDto: { email: 254, password: 128 },
  PermissionTemplateDto: { cssClass: 50, label: 100, name: 50 },
  RegisterDto: { displayName: 100, email: 254, password: 128 },
  UpdateAssetTypeDto: { description: 100 },
  UpdateCampusDto: { city: 100, contact: 150, country: 100, street: 150, zip: 20 },
  UpdateClassDto: { className: 100 },
  UpdateRoomDto: { floor: 20, name: 100, notes: 200 },
  UpdateUserDto: { displayName: 100, email: 254, password: 128 },
} as const;

/** Helper: extract the limits object for a given DTO name. */
export type LimitsFor<T extends keyof typeof INPUT_LIMITS> = (typeof INPUT_LIMITS)[T];
