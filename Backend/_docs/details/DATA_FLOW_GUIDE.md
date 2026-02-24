# Data Flow Guide

This guide explains how data moves through the application layers and which model types are used at each step.

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │  Frontend   │
                              │   (JSON)    │
                              └──────┬──────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▲
             CreateRoomDto                    RoomResponseDto
             UpdateRoomDto                    (Output to client)
             (Input from client)
                    │                                 ▲
                    ▼                                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENDPOINT LAYER                                    │
│                                                                             │
│   • Receives DTOs from frontend                                             │
│   • Layer 2 validation (format, required fields)                            │
│   • Returns DTOs to frontend                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                 ▲
                    ▼                                 │
             CreateRoomDto                    RoomResponseDto
             UpdateRoomDto
                    │                                 ▲
                    ▼                                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE LAYER                                     │
│                                                                             │
│   • Receives DTOs from endpoint                                             │
│   • Converts DTO → Entity (for writes)                                      │
│   • Layer 3 validation (business rules, existence checks)                   │
│   • Converts Entity → DTO (for reads)                                       │
│   • Returns DTOs to endpoint                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                 ▲
                    ▼                                 │
              Room (Entity)                    Room (Entity)
                    │                                 ▲
                    ▼                                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPOSITORY LAYER                                    │
│                                                                             │
│   • Receives Entities from service                                          │
│   • Executes SQL queries                                                    │
│   • Returns Entities to service                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                                 ▲
                    ▼                                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE                                          │
│                                                                             │
│   • Stores data in tables                                                   │
│   • Returns rows mapped to Entities                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Model Types

### 1. DTOs (Data Transfer Objects)

**Purpose:** Communication with the frontend.

**Location:** `Backend/app/Core/Models/DTO/`

| DTO Type         | Direction      | Contains ID? | Example           |
| ---------------- | -------------- | ------------ | ----------------- |
| `Create___Dto`   | Frontend → API | ❌ No        | `CreateRoomDto`   |
| `Update___Dto`   | Frontend → API | ❌ No        | `UpdateRoomDto`   |
| `___ResponseDto` | API → Frontend | ✅ Yes       | `RoomResponseDto` |

**Why separate Create/Update from Response?**

- **Create:** No ID (database generates it)
- **Response:** Has ID (frontend needs it to reference the resource)

```csharp
// Input: No ID
public record CreateRoomDto(
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Address,
    string? Notes
);

// Output: Has ID
public record RoomResponseDto(
    int Id,              // ← Database generated this
    string Name,
    int? Capacity,
    RoomType Type,
    string? Floor,
    string? Address,
    string? Notes
);
```

### 2. Entities

**Purpose:** Mirror database tables exactly.

**Location:** `Backend/app/Core/Models/Entities/`

**Used by:** Repository layer for SQL operations.

```csharp
public class Room
{
    public long Id { get; set; }
    public long CampusId { get; set; }
    public required string Name { get; set; }
    public int? Capacity { get; set; }
    public long RoomTypeId { get; set; }
    public string? Floor { get; set; }
    public string? Notes { get; set; }
}
```

**Why not just use DTOs everywhere?**

- Entities may contain sensitive fields (e.g., `PasswordHash` in User)
- Entities match database column names exactly
- DTOs control what the API exposes
- Response DTOs include resolved names (e.g., `CampusCity`, `RoomTypeName`) that aren’t stored on the entity

### 3. Enums

**Purpose:** Fixed set of choices.

**Location:** `Backend/app/Core/Models/Enums/`

**Used by:** All layers.

```csharp
public enum BookingStatus
{
    Active,
    Cancelled,
    Expired
}
```

### 4. ReadModels (Optional)

**Purpose:** Complex queries that don't match an entity.

**Location:** `Backend/app/Core/Models/ReadModels/`

**When to use:** When a SQL query returns data from multiple tables or calculated fields.

```csharp
// Example: Room with booking count
public class RoomWithBookingCount
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int BookingCount { get; set; }  // Calculated, not in Room table
}
```

```sql
SELECT r.id, r.name, COUNT(b.id) as BookingCount
FROM rooms r
LEFT JOIN bookings b ON r.id = b.room_id
GROUP BY r.id
```

## Complete Example: Creating a Room

### Step 1: Frontend Sends Request

```json
POST /api/rooms
{
    "campusId": 1,
    "name": "Conference Room A",
    "capacity": 20,
    "roomTypeId": 3,
    "floor": "2nd",
    "notes": "Has projector",
    "assetIds": [1, 4]
}
```

### Step 2: Endpoint Receives DTO

```csharp
// RoomEndpoints.cs
group.MapPost("/", async (CreateRoomDto dto, RoomService service) =>
{
    // Layer 2: Validate input format
    if (string.IsNullOrWhiteSpace(dto.Name))
        return Results.BadRequest("Room name is required.");

    var createdRoom = await service.CreateRoomAsync(dto);
    return Results.Created($"/api/rooms/{createdRoom.Id}", createdRoom);
});
```

### Step 3: Service Converts DTO → Entity

```csharp
// RoomService.cs
public async Task<RoomResponseDto> CreateRoomAsync(CreateRoomDto dto)
{
    // Validate asset IDs exist
    if (dto.AssetIds != null && dto.AssetIds.Count != 0)
        await assetService.ValidateAssetIdsAsync(dto.AssetIds);

    // Convert DTO to Entity
    var room = new Room
    {
        CampusId = dto.CampusId,
        Name = dto.Name,
        Capacity = dto.Capacity,
        RoomTypeId = dto.RoomTypeId,
        Floor = dto.Floor,
        Notes = dto.Notes,
    };

    // Send Entity to repository
    var newId = await repo.CreateRoomAsync(room);

    // Add assets to the room via link table
    if (dto.AssetIds != null && dto.AssetIds.Count != 0)
        await repo.AddAssetsToRoomAsync(newId, dto.AssetIds);

    // Fetch the full detail (with resolved names) via ReadModel repo
    var createdRoomDetail = await readModelRepo.GetRoomDetailByIdAsync(newId);
    return MapDetailToResponse(createdRoomDetail);
}
```

### Step 4: Repository Writes Entity to Database

```csharp
// SqliteRoomRepo.cs
public async Task<long> CreateRoomAsync(Room room)
{
    const string sql = @"
        INSERT INTO rooms (campus_id, name, capacity, room_type_id, floor, notes)
        VALUES (@CampusId, @Name, @Capacity, @RoomTypeId, @Floor, @Notes);
        SELECT last_insert_rowid();";

    using var conn = await db.CreateConnectionAsync();
    return await conn.ExecuteScalarAsync<long>(sql, room);
}
```

### Step 5: Response Sent to Frontend

```json
HTTP 201 Created
Location: /api/rooms/42

{
    "id": 42,
    "campusId": 1,
    "name": "Conference Room A",
    "campusCity": "Stockholm",
    "capacity": 20,
    "roomTypeId": 3,
    "roomTypeName": "MeetingRoom",
    "floor": "2nd",
    "notes": "Has projector",
    "assets": ["Projector", "Whiteboard"]
}
```

## Quick Reference Table

| Layer          | Receives                  | Returns       | Model Type            |
| -------------- | ------------------------- | ------------- | --------------------- |
| **Endpoint**   | `CreateDto` / `UpdateDto` | `ResponseDto` | DTO                   |
| **Service**    | DTO                       | DTO           | Converts DTO ↔ Entity |
| **Repository** | Entity                    | Entity or ID  | Entity                |
| **Database**   | SQL                       | Rows          | —                     |

## Common Mistakes to Avoid

### ❌ Returning Entities from Endpoints

```csharp
// BAD: Exposes internal data structure
return Results.Ok(room);  // room is Entity
```

```csharp
// GOOD: Return DTO
return Results.Ok(MapToDto(room));
```

### ❌ Using DTOs in Repository

```csharp
// BAD: Repository should use Entities
public async Task<int> CreateRoomAsync(CreateRoomDto dto)
```

```csharp
// GOOD: Repository uses Entity
public async Task<int> CreateRoomAsync(Room room)
```

### ❌ Sending Entities to Frontend with Sensitive Data

```csharp
// BAD: User entity contains password hash!
return Results.Ok(user);
```

```csharp
// GOOD: UserResponseDto excludes sensitive fields
return Results.Ok(new UserResponseDto(user.Id, user.Email, user.Name));
```

## Summary

| Model Type     | Purpose                   | Location              | Used By             |
| -------------- | ------------------------- | --------------------- | ------------------- |
| **DTO**        | Talk to frontend          | `Models/DTO/`         | Endpoint, Service   |
| **Entity**     | Talk to database          | `Models/Entities/`    | Service, Repository |
| **Enum**       | Fixed choices             | `Models/Enums/`       | All layers          |
| **ReadModel**  | Complex queries           | `Models/ReadModels/`  | Repository, Service |
| **Projection** | Flat auth/middleware data | `Models/Projections/` | Middleware, Service |
