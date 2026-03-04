# 🛡️ Backend Production Readiness Analysis

**Date:** 2026-02-08  
**Scope:** `Backend/**`  
**Framework:** .NET 9.0
**Architecture:** Layered (Endpoints → Services → Repositories → Dapper, SQLite/PostgreSQL)

---

## 🚨 1. Critical Security Vulnerabilities

### 1.1. Authorization Implementation

**Severity:** 🟢 **RESOLVED**  
**Location:** `UserEndpoints.cs`, `BookingEndpoints.cs`, `RoomEndpoints.cs`  
**Analysis:**

- **Status:** The system now uses a robust **Permission-Based Access Control** (Template + Override) architecture.
- **Implementation:** All critical endpoints are protected by `.RequirePermission("PermissionName")` middleware.
- **Granularity:** Access is checked against a live database view (`v_user_effective_permissions`), ensuring revoked rights apply immediately.

### 1.2. Insecure Booking Logic (ID Spoofing)

**Severity:** � **RESOLVED**  
**Location:** `BookingEndpoints.cs` → `POST /`
**Analysis:**

- **Status:** The POST endpoint now extracts the authenticated user from `HttpContext.Items["UserId"]` and overwrites the DTO's `UserId` field, preventing spoofing.

### 1.3. Cookie Configuration for Production

**Severity:** � **RESOLVED**  
**Location:** `AuthEndpoints.cs`
**Analysis:**

- **Status:** Cookie `Secure` flag is now set to `!env.IsDevelopment()`, ensuring cookies are transmitted over HTTPS in production.

---

## 🏗️ 2. Architecture & Incomplete Features

### 2.1. Incomplete Booking Endpoints

**Severity:** � **RESOLVED**  
**Location:** `BookingEndpoints.cs`
**Analysis:**

- **Status:** Booking endpoints now include `PUT /{id}` for updating booking status (including cancellation) and `GET /my-owned` for fetching the authenticated user's bookings.

### 2.2. PostgreSQL Support

**Severity:** 🟢 **RESOLVED**  
**Location:** `DbConnectionFactory.cs`, `Program.cs`
**Analysis:**

- **Status:** PostgreSQL is now fully implemented with 10 repository classes (`Postgres*Repo.cs`), a `PostgresDbInitializer`, and dedicated schema/seed SQL files (`PostgresSchema.sql`, `PostgresSeed.sql`).
- **Remaining:** SQL Server support is stubbed (`DbConnectionFactory` can create connections) but `Program.cs` blocks registration with `NotSupportedException`. No SQL Server repos or initializer exist yet.

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
**Location:** `SqliteDbInitializer.cs`, `PostgresDbInitializer.cs`
**Analysis:**

- The app uses raw SQL files (`SqliteSchema.sqlite` / `PostgresSchema.sql`) to initialize the DB.
- **Problem:** If you modify a table structure in production (e.g., add a column to `Bookings`), the current initializer might fail or do nothing. It does not support **versioned migrations** (Up/Down scripts).
- **Fix Required:** Implement a migration tool like **DbUp** or **Evolve** to manage schema changes safely.

### 3.2. Concurrency Handling

**Severity:** 🟡 **MEDIUM**  
**Location:** `SqliteRoomRepo.cs`
**Analysis:**

- The `DeleteRoomAsync` method uses a transaction to delete assets and then the room.
- SQLite locks the file during writes. In a high-traffic booking scenario, this might lead to `SQLITE_BUSY` errors.
- **Fix Required:** Ensure retry logic (Polly) is added to `DbConnectionFactory` or repository calls.

### 3.3. SQLite Primary Key Nullability

**Severity:** 🟢 **RESOLVED**
**Location:** `SqliteSchema.sqlite`
**Analysis:**

- **Issue:** In SQLite, `PRIMARY KEY` columns (except `INTEGER PRIMARY KEY`) allow `NULL` values by default unless explicitly marked `NOT NULL`.
- **Impact:** The `system_permissions` table's `key` column was technically nullable, which could lead to invalid permission states if a `NULL` key were inserted.
- **Fix Applied:** Updated `schema.sqlite` to explicitly define `key TEXT PRIMARY KEY NOT NULL`.
- **Breaking Change Warning:** If applying this schema to an existing database with `NULL` keys (unlikely but possible), the migration/creation will fail. Ensure existing data is clean.

---

## ⚙️ 4. Operational Readiness

### 4.2. Health Checks

**Severity:** 🟢 **LOW**  
**Analysis:**

- No `/health` endpoint. Container orchestrators (Kubernetes/Docker Swarm) need this to know if the app is alive.
