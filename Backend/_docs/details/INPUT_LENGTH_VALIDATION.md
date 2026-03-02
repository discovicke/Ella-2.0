# Input Length Validation

> Single source of truth in C# → auto-synced to frontend via OpenAPI.

## Why

Without max-length limits, any text field is an attack surface. A malicious (or buggy) client can send megabyte-sized strings in `name`, `notes`, etc. — wasting memory, bloating the database, and potentially causing denial-of-service.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  InputLimits.cs                                                  │
│  (single source of truth — all constants live here)              │
└──────┬───────────────────────────┬───────────────────────────────┘
       │                           │
       ▼                           ▼
  [MaxLength] on DTOs        CheckLength() in endpoints
       │                      (imperative server-side guard)
       │
       ▼
  OpenAPI spec (models.json)
  ── maxLength appears in schema ──
       │
       ▼
  generate-input-limits.js
  (reads models.json at build time)
       │
       ▼
  input-limits.ts  ← auto-generated, never hand-edited
       │
       ▼
  Angular forms (Validators.maxLength + HTML maxlength)
```

## The Three Enforcement Layers

### 1. Backend — `InputLimits.cs`

**Location:** `Backend/app/Core/Validation/InputLimits.cs`

All max-length constants are declared here as `public const int`. Every limit in the entire system reads from this single file.

```csharp
public static class InputLimits
{
    public const int Email = 254;          // RFC 5321
    public const int Password = 128;
    public const int BookerName = 100;
    public const int BookingNotes = 500;
    // ... etc
}
```

It also provides a helper method used by endpoints:

```csharp
public static IResult? CheckLength(string? value, int maxLength, string fieldName)
```

Returns `400 Bad Request` if the string exceeds the limit, or `null` if OK.

### 2. Backend — `[MaxLength]` on DTOs

Every DTO string property has a `[MaxLength(InputLimits.X)]` annotation:

```csharp
// Positional record syntax uses [property: ...]
public record CreateRoomDto(
    long CampusId,
    [property: MaxLength(InputLimits.RoomName)] string Name,
    [property: MaxLength(InputLimits.RoomFloor)] string? Floor,
    [property: MaxLength(InputLimits.RoomNotes)] string? Notes,
    // ...
);

// Class-style record uses standard [MaxLength]
public record LoginDto
{
    [MaxLength(InputLimits.Email)]
    public required string Email { get; set; }
}
```

**Why both `[MaxLength]` and `CheckLength()`?**

- `[MaxLength]` → feeds into the **OpenAPI spec** so the frontend can auto-discover limits.
- `CheckLength()` → **imperative server-side guard** at runtime. ASP.NET Minimal APIs do not automatically enforce data annotations, so we guard manually in each endpoint's validation block.

### 3. Frontend — Auto-Generated `input-limits.ts`

**Location:** `Frontend/ng.Frontend/src/app/shared/constants/input-limits.ts`

This file is **auto-generated** — **never edit it by hand**. It is regenerated every time `api:sync` runs.

```typescript
// Auto-generated from the OpenAPI spec — DO NOT EDIT manually.
export const INPUT_LIMITS = {
  CreateRoomDto: { floor: 20, name: 100, notes: 200 },
  LoginDto: { email: 254, password: 128 },
  // ... one entry per schema, one key per constrained property
} as const;
```

Forms use it for both Angular validator and HTML attribute:

```typescript
// TS — reactive form validator
name: new FormControl('', {
  validators: [Validators.required, Validators.maxLength(INPUT_LIMITS.CreateRoomDto.name)],
}),
```

```html
<!-- HTML — native browser enforcement -->
<input formControlName="name" maxlength="100" />
```

## How Auto-Sync Works

The generation script: `Frontend/ng.Frontend/scripts/generate-input-limits.js`

1. Reads `openapi/models.json`
2. Iterates `components.schemas`, extracting every property with a `maxLength` field
3. Writes `input-limits.ts` keyed by schema name (DTO name)

**It runs automatically** as part of the `api:sync` npm script (see `Frontend/ng.Frontend/package.json`):

```
api:sync = swagger-typescript-api generate ... && node scripts/generate-input-limits.js
```

Which is called by the root scripts:

- `npm start` (via `refresh:models` chain)
- `npm run refresh:models`

## How to Change a Limit

1. Update the constant in **`InputLimits.cs`** (e.g. change `BookerName = 100` → `BookerName = 150`)
2. Run `npm run refresh:models` from the project root
3. Done — both `models.json` and `input-limits.ts` are regenerated

That's it. No manual frontend edits needed.

## How to Add a New Field

1. Add a new constant to `InputLimits.cs`
2. Add `[MaxLength(InputLimits.NewField)]` to the relevant DTO property
3. Add `InputLimits.CheckLength(dto.NewField, InputLimits.NewField, "NewField")` to the endpoint validation
4. Run `npm run refresh:models`
5. In the Angular form, use `INPUT_LIMITS.YourDto.newField` for `Validators.maxLength()` and the HTML `maxlength` attribute

## Current Limits Reference

| Category | Field         | Max Length |
| -------- | ------------- | ---------- |
| Identity | Email         | 254        |
| Identity | Password      | 128        |
| Identity | DisplayName   | 100        |
| Booking  | BookerName    | 100        |
| Booking  | BookingNotes  | 500        |
| Room     | RoomName      | 100        |
| Room     | RoomFloor     | 20         |
| Room     | RoomNotes     | 200        |
| Campus   | CampusCity    | 100        |
| Campus   | CampusStreet  | 150        |
| Campus   | CampusZip     | 20         |
| Campus   | CampusCountry | 100        |
| Campus   | CampusContact | 150        |
| Class    | ClassName     | 100        |
| Asset    | Description   | 100        |
| Template | Name          | 50         |
| Template | Label         | 100        |
| Template | CssClass      | 50         |

## Key Files

| File                                                            | Role                                          |
| --------------------------------------------------------------- | --------------------------------------------- |
| `Backend/app/Core/Validation/InputLimits.cs`                    | Single source of truth for all limits         |
| `Backend/app/Core/Models/DTO/*.cs`                              | `[MaxLength]` annotations → flow into OpenAPI |
| `Backend/app/API/Endpoints/*.cs`                                | `CheckLength()` imperative guards at runtime  |
| `Frontend/ng.Frontend/scripts/generate-input-limits.js`         | Reads OpenAPI → generates TS constants        |
| `Frontend/ng.Frontend/src/app/shared/constants/input-limits.ts` | Auto-generated frontend constants             |
| `Frontend/ng.Frontend/src/app/pages/**/*.ts`                    | Forms use `INPUT_LIMITS.DtoName.field`        |
