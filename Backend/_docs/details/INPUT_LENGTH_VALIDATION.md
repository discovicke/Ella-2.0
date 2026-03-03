# Input Length Validation

> `[MaxLength]` on DTOs → auto-enforced by `ValidationFilter` → auto-synced to frontend via OpenAPI.

## Why

Without max-length limits, any text field is an attack surface. A malicious (or buggy) client can send megabyte-sized strings in `name`, `notes`, etc. — wasting memory, bloating the database, and potentially causing denial-of-service.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  DTOs  (e.g. CreateRoomDto)                              │
│  [MaxLength(100)] directly on each string property       │
└──────┬───────────────────────────┬───────────────────────┘
       │                           │
       ▼                           ▼
  ValidationFilter             OpenAPI spec (models.json)
  (auto-enforces at runtime)   ── maxLength in schema ──
                                   │
                                   ▼
                             generate-input-limits.js
                             (reads models.json at build time)
                                   │
                                   ▼
                             input-limits.ts  ← auto-generated
                                   │
                                   ▼
                             Angular HTML maxlength attrs
```

## The Two Enforcement Layers

### 1. Backend — `ValidationFilter` + `[MaxLength]` on DTOs

**ValidationFilter** (`Backend/app/Infrastructure/Middleware/ValidationFilter.cs`) is an `IEndpointFilter` registered once on the API group in `Program.cs`:

```csharp
var api = app.MapGroup("api").AddEndpointFilter<ValidationFilter>();
```

It automatically validates all `System.ComponentModel.DataAnnotations` attributes (like `[MaxLength]`) on every DTO parameter before the endpoint code runs. If validation fails, it returns `400 Bad Request` with error details.

Every DTO string property has a `[MaxLength(N)]` annotation with the limit written directly:

```csharp
// Positional record syntax
public record CreateRoomDto(
    long CampusId,
    [property: MaxLength(100)] string Name,
    [property: MaxLength(20)] string? Floor,
    [property: MaxLength(200)] string? Notes,
    List<long>? AssetIds
);

// Class-style record
public record LoginDto
{
    [MaxLength(254)]
    public required string Email { get; set; }
}
```

No manual `CheckLength()` calls needed — the filter handles everything.

### 2. Frontend — HTML `maxlength` Attributes

HTML `maxlength` attributes on `<input>` and `<textarea>` elements prevent users from typing beyond the limit. The values come from the auto-generated `input-limits.ts` constant file.

```html
<input formControlName="name" maxlength="100" />
```

The constants file (`input-limits.ts`) is auto-generated from the OpenAPI spec — never edit it by hand.

## How Auto-Sync Works

The generation script: `Frontend/ng.Frontend/scripts/generate-input-limits.js`

1. Reads `openapi/models.json`
2. Iterates `components.schemas`, extracting every property with a `maxLength` field
3. Writes `input-limits.ts` keyed by schema name (DTO name)

**It runs automatically** as part of the `api:sync` npm script:

```
api:sync = swagger-typescript-api generate ... && node scripts/generate-input-limits.js
```

## How to Change a Limit

1. Update the `[MaxLength(N)]` value on the relevant DTO property
2. Run `npm run refresh:models` from the project root
3. Done — both `models.json` and `input-limits.ts` are regenerated

That's it. No manual frontend edits needed.

## How to Add a New Field

1. Add `[MaxLength(N)]` to the new DTO string property
2. Run `npm run refresh:models`
3. In the Angular template, use `INPUT_LIMITS.YourDto.newField` for the HTML `maxlength` attribute

## Current Limits Reference

| Category | DTO Property | Max Length |
| -------- | ------------ | ---------- |
| Identity | Email        | 254        |
| Identity | Password     | 128        |
| Identity | DisplayName  | 100        |
| Booking  | BookerName   | 100        |
| Booking  | Notes        | 500        |
| Room     | Name         | 100        |
| Room     | Floor        | 20         |
| Room     | Notes        | 200        |
| Campus   | City         | 100        |
| Campus   | Street       | 150        |
| Campus   | Zip          | 20         |
| Campus   | Country      | 100        |
| Campus   | Contact      | 150        |
| Class    | ClassName    | 100        |
| Asset    | Description  | 100        |
| Template | Name         | 50         |
| Template | Label        | 100        |
| Template | CssClass     | 50         |

## Key Files

| File                                                            | Role                                             |
| --------------------------------------------------------------- | ------------------------------------------------ |
| `Backend/app/Infrastructure/Middleware/ValidationFilter.cs`     | Auto-enforces DataAnnotation attributes          |
| `Backend/app/Core/Models/DTO/*.cs`                              | `[MaxLength(N)]` → single source of truth        |
| `Frontend/ng.Frontend/scripts/generate-input-limits.js`         | Reads OpenAPI → generates TS constants           |
| `Frontend/ng.Frontend/src/app/shared/constants/input-limits.ts` | Auto-generated frontend constants                |
| `Frontend/ng.Frontend/src/app/pages/**/*.html`                  | HTML `maxlength` attrs use `INPUT_LIMITS` values |
