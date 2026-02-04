# Read Model Repository Guide

## Overview

In this project, we separate **Write Operations** (CRUD) from **Read Operations** (Queries) where beneficial. This is a lightweight implementation of the **CQRS (Command Query Responsibility Segregation)** pattern.

-   **Standard Repositories:** Handle standard CRUD (Create, Read, Update, Delete) for single entities. They map directly to database tables.
-   **Read Model (Query) Repositories:** Handle complex data retrieval. They are optimized for reading and often join multiple tables to return a "flat" or "shaped" view of the data that the UI needs.

## Key Differences

| Feature | Standard Repository (e.g., `SqliteRoomRepo`) | Read Model Repository (e.g., `SqliteRoomReadModelRepo`) |
| :--- | :--- | :--- |
| **Primary Goal** | Manage Entity State (Insert, Update, Delete) | Fetch Data for Display (Select) |
| **Return Type** | Entities (`Room`, `User`) | Read Models (`RoomDetailModel`) |
| **Database Ops** | Simple SELECT, INSERT, UPDATE, DELETE | Complex SELECT with JOINs, Grouping, Aggregation |
| **Usage** | Business Logic, Validation, State Changes | UI Display, Reports, Dashboards |

## How It Works

### 1. The Interface

Define an interface in `Core/Interfaces` that returns specific **Read Models** instead of Entities.

```csharp
// Core/Interfaces/IRoomReadModelRepository.cs
public interface IRoomReadModelRepository
{
    Task<IEnumerable<RoomDetailModel>> GetAllRoomDetailsAsync();
    Task<RoomDetailModel?> GetRoomDetailByIdAsync(int roomId);
}
```

### 2. The Implementation (Dapper & SQLite)

The implementation in `Infrastructure/Repositories/Sqlite` uses **Dapper** to execute raw SQL. This is often faster and more flexible than EF Core for complex reads.

**Handling One-to-Many Relationships (e.g., Room -> Assets):**

Since SQL returns flat rows (one row per asset), we use a helper private class (e.g., `RoomDetailRow`) to capture the raw database output and then **Group** the results in memory.

```csharp
// Inside SqliteRoomReadModelRepo.cs

// 1. Fetch raw flat data
var rawData = await conn.QueryAsync<RoomDetailRow>(sql);

// 2. Group by ID to merge the 'Many' side (Assets)
var result = rawData
    .GroupBy(r => r.RoomId)
    .Select(g => new RoomDetailModel(
        ...,
        Assets: g.Select(x => x.AssetDescription).ToList()
    ));
```

### 3. Registration

Register the new repository in `Program.cs` under the appropriate database provider switch.

```csharp
// Program.cs
case "sqlite":
    builder.Services.AddScoped<IRoomRepository, SqliteRoomRepo>();           // Write/Standard
    builder.Services.AddScoped<IRoomReadModelRepository, SqliteRoomReadModelRepo>(); // Read/Query
    break;
```

## When to Create a Read Model Repo?

Create a Read Model Repository when:
1.  **Performance:** You need to join 3+ tables and standard ORM loading is too slow or generates N+1 queries.
2.  **Shape:** The UI needs data in a specific format that doesn't match your Entity structure (e.g., a "Dashboard Summary").
3.  **Complexity:** You need to calculate fields on the fly (sums, averages) or filter by related data efficiently.

## File Naming Convention

-   **Interface:** `I{Entity}ReadModelRepository.cs` (e.g., `IRoomReadModelRepository`)
-   **Implementation:** `Sqlite{Entity}ReadModelRepo.cs` (e.g., `SqliteRoomReadModelRepo`)
-   **Model:** `Core/Models/ReadModels/{Entity}ReadModels.cs`
