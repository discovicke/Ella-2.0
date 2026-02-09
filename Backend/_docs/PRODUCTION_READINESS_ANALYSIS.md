# 🛡️ Backend Production Readiness Analysis

**Date:** 2026-02-08  
**Scope:** `Backend/**`  
**Framework:** .NET 10.0
**Architecture:** Layered (Endpoints → Services → Repositories → Dapper/SQLite)

---

## 🚨 1. Critical Security Vulnerabilities

### 1.1. Missing Authorization on Administrative Endpoints
**Severity:** 🔥 **CRITICAL**  
**Location:** `UserEndpoints.cs`, `RoomEndpoints.cs`, `AssetEndpoints.cs`  
**Analysis:**
While the `AuthorizationMiddleware` exists, it is **not applied** to critical endpoints.
- **Users:** `GET`, `POST`, `PUT`, `DELETE` on `/api/users` are publicly accessible. An anonymous user can delete the database administrator or download the entire user database.
- **Rooms/Assets:** Creating and deleting rooms or assets is publicly accessible.
- **Fix Required:** Apply `.RequireAuth()` and `.RequireRoles(UserRole.Admin)` to these route groups.

### 1.2. Insecure Booking Logic (ID Spoofing)
**Severity:** 🔴 **HIGH**  
**Location:** `BookingEndpoints.cs` → `POST /`
**Analysis:**
The `CreateBookingDto` accepts a `UserId`.
- There is no check to ensure the `UserId` in the DTO matches the `HttpContext.User.Identity`.
- **Exploit:** An authenticated student could technically create a booking on behalf of a educator or another student by simply sending a different `UserId` in the JSON payload.
- **Fix Required:** Ignore `UserId` from DTO and force use of `HttpContext.Items["UserId"]` for non-admin users.

### 1.3. Cookie Configuration for Production
**Severity:** 🟡 **MEDIUM**  
**Location:** `AuthEndpoints.cs`
**Analysis:**
- `Secure = false` is hardcoded. This must be `true` in production to prevent cookie transmission over non-HTTPS connections.
- **Fix Required:** Use `app.Environment.IsProduction()` to toggle this flag.

---

## 🏗️ 2. Architecture & Incomplete Features

### 2.1. Incomplete Booking Endpoints
**Severity:** 🔴 **HIGH**  
**Location:** `BookingEndpoints.cs`
**Analysis:**
The file contains a `TODO: Migrate all booking endpoints`.
- **Missing Actions:** There is no endpoint mapped to **Update** a booking or **Cancel** a booking, even though `BookingService` has `CancelBookingAsync`.
- **Missing Filters:** The `GET /` endpoint returns *all* bookings. There are no endpoints exposed for "My Bookings" or "Bookings for Room X", despite the ReadModel repository supporting these queries.

### 2.2. PostgreSQL Support Missing
**Severity:** 🟡 **MEDIUM**  
**Location:** `DbConnectionFactory.cs`, `Program.cs`
**Analysis:**
- The `.env.example` implies Postgres is an option, but the code explicitly throws `NotImplementedException`.
- **Impact:** Production usually requires a robust DB (Postgres/SQL Server) rather than SQLite.
- **Fix Required:** Implement the PostgreSQL connection logic and ensure Dapper queries are compatible (Postgres uses `@param` or `:param` but is case-sensitive on identifiers sometimes; SQLite queries might need adjustment).

### 2.3. No Background Jobs / Token Cleanup
**Severity:** 🟢 **LOW**  
**Location:** `AuthService.cs`
**Analysis:**
- Tokens are invalidated using a timestamp (`TokensValidAfter`).
- **Missing:** There is no mechanism to clean up old/expired tokens or expired bookings from the database (if "soft delete" or archiving is desired).

---

## 💾 3. Database & Data Integrity

### 3.1. Lack of Migration Strategy
**Severity:** 🔴 **HIGH**  
**Location:** `SqliteDbInitializer.cs`
**Analysis:**
- The app uses a raw file (`schema.sqlite`) to initialize the DB.
- **Problem:** If you modify a table structure in production (e.g., add a column to `Bookings`), the current initializer might fail or do nothing. It does not support **versioned migrations** (Up/Down scripts).
- **Fix Required:** Implement a migration tool like **DbUp** or **Evolve** to manage schema changes safely.

### 3.2. Concurrency Handling
**Severity:** 🟡 **MEDIUM**  
**Location:** `SqliteRoomRepo.cs`
**Analysis:**
- The `DeleteRoomAsync` method uses a transaction to delete assets and then the room.
- SQLite locks the file during writes. In a high-traffic booking scenario, this might lead to `SQLITE_BUSY` errors.
- **Fix Required:** Ensure retry logic (Polly) is added to `DbConnectionFactory` or repository calls.

---

## ⚙️ 4. Operational Readiness

### 4.1. Logging Infrastructure
**Severity:** 🟡 **MEDIUM**  
**Analysis:**
- The app uses standard `ILogger`.
- **Missing:** No structured logging sink (e.g., Serilog, Application Insights) is configured. In production, console logs are often lost or hard to query.

### 4.2. Health Checks
**Severity:** 🟢 **LOW**  
**Analysis:**
- No `/health` endpoint. Container orchestrators (Kubernetes/Docker Swarm) need this to know if the app is alive.

### 4.3. Docker Support
**Severity:** 🟡 **MEDIUM**  
**Analysis:**
- No `Dockerfile` or `.dockerignore` exists in the `Backend` directory.

---

## 🧪 5. Testing & Quality Assurance

### 5.1. Zero Automated Tests
**Severity:** 🔴 **HIGH**  
**Analysis:**
- There is no `Backend.Tests` project visible.
- **Risk:** Refactoring or bug fixing has a high chance of introducing regressions.
- **Fix Required:** Create an xUnit/NUnit project and add unit tests for `Services` (mocking Repositories) and integration tests for `Endpoints`.

---

## ✅ Action Plan (Prioritized)

1.  **Secure Endpoints:** Add `RequireAuth()`/`RequireRoles()` to User, Room, and Asset endpoints immediately.
2.  **Finish Booking API:** Expose Cancel/Update endpoints and implement "My Bookings" filters.
3.  **Fix Booking Logic:** Secure the `CreateBooking` flow to prevent ID spoofing.
4.  **Tests:** Initialize a test project and write core authentication/booking tests.
5.  **Migrations:** Replace `SqliteDbInitializer` with a proper migration runner.
