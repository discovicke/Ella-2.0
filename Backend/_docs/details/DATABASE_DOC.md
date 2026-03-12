# Database Schema Documentation

> **Source of truth:** [`SqliteSchema.sqlite`](../../app/Infrastructure/Data/SqliteSchema.sqlite) (SQLite) and [`PostgresSchema.sql`](../../app/Infrastructure/Data/PostgresSchema.sql) (PostgreSQL).

<!-- dbdocs-link:start -->
📊 **[View live schema diagram](https://dbdocs.io/christiangennari61/ELLA2)** — _auto-updated via GitHub Actions_
<!-- dbdocs-link:end -->

---

## Relationship Overview

### **1. Auth & Identity**

- **One User** belongs to **One Permission Template** (Role) OR acts as a **Custom User** (No Template).
- **One User** can have **One Booking Slug** (via `user_booking_slugs`) for public booking identification.
- **Security Strategy:**
  - **Passwords** are hashed using **Argon2** (via `IPasswordHasher`).
  - **Sessions** are stateless using JWTs. Global logout (revocation) is handled by the `tokens_valid_after` timestamp. Any JWT issued before this timestamp is considered invalid.

### **2. Campus, Classes & Users**

- **One Campus** contains **Many Rooms**. Rooms are linked to a campus via `campus_id`.
- **One Class** is linked to **Many Campuses** via the `class_campus` bridge table.
- **Users** can belong to **Many Classes** (via `user_class`) and **Many Campuses** (via `user_campus`).

### **3. Rooms & Equipment**

- **One Room Type** categorizes **Many Rooms** via `room_type_id`.
- **One Room** contains **Many Assets** (physical items inside).
- **One Asset Type** (e.g., "Projektor") defines **Many Assets**.
- _Note: An "Asset" (`room_assets`) connects a specific Room to a specific Asset Type._

### **4. Resource Management (Movable Items)**

- **One Resource Category** (e.g., "Fordon") contains **Many Bookable Resources**.
- **One Bookable Resource** (e.g., "Skolbil 1") is linked to a **Campus** and can have **Many Resource Bookings**.
- **One User** can make **Many Resource Bookings**.

### **5. Bookings & Registrations**

- **One Room** hosts **Many Bookings** (scheduled at different times).
- **One User** (Host) organizes **Many Bookings**.
- **One Booking** has **Many Registrations** (participants).
- **Registrations** have a **status** column: `0 = Invited`, `1 = Registered`, `2 = Declined`.
- **Bookings** can be part of a **Recurring Series** (via `recurring_group_id`).

---

## Technical Note on Dates

The project supports both **SQLite** and **PostgreSQL**. Date handling differs by provider:

### SQLite
- Stored as **TEXT** strings in **ISO-8601** format: `"YYYY-MM-DD HH:MM:SS"`.
- Lexicographically sortable.

### PostgreSQL
- Uses native `TIMESTAMPTZ` columns (timezone aware).

### Developer Rule
Always save dates as `DateTime.UtcNow` in C# to ensure consistency.

---

## SQL Schema (SQLite snippet)

### 1. Users & RBAC
```sql
CREATE TABLE IF NOT EXISTS users (
    id                     INTEGER PRIMARY KEY,
    email                  TEXT NOT NULL UNIQUE,
    password_hash          TEXT NOT NULL,
    display_name           TEXT,
    is_banned              INTEGER NOT NULL DEFAULT 0,
    is_active              INTEGER NOT NULL DEFAULT 1,
    permission_level       INTEGER NOT NULL DEFAULT 1,
    tokens_valid_after     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    permission_template_id INTEGER REFERENCES permission_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_booking_slugs (
    id         INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug       TEXT NOT NULL UNIQUE,
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Bookings
```sql
CREATE TABLE IF NOT EXISTS bookings (
    id                 INTEGER PRIMARY KEY,
    user_id            INTEGER NOT NULL REFERENCES users(id),
    room_id            INTEGER NOT NULL REFERENCES rooms(id),
    start_time         TEXT NOT NULL,
    end_time           TEXT NOT NULL,
    status             INTEGER NOT NULL DEFAULT 0, -- 0=Active, 1=Cancelled, 2=Expired, 3=Pending
    is_lesson          INTEGER NOT NULL DEFAULT 0,
    notes              TEXT,
    booker_name        TEXT,
    recurring_group_id TEXT,
    created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TEXT
);
```

### 3. Resources
```sql
CREATE TABLE IF NOT EXISTS bookable_resources (
    id          INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES resource_categories(id),
    campus_id   INTEGER NOT NULL REFERENCES campus(id),
    name        TEXT NOT NULL,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1
);
```

---

## Views (Read Models)

### `v_bookings_detailed`
Enriched view for the UI. Handles dynamic status calculation.

**PostgreSQL logic:**
```sql
CASE
    WHEN b.status = 'cancelled' THEN 'cancelled'
    WHEN b.status = 'pending' THEN 'pending'
    WHEN b.end_time < NOW() THEN 'expired'
    ELSE 'active'
END::booking_status AS status
```

**SQLite logic:**
```sql
CASE
    WHEN b.status = 1 THEN 1
    WHEN b.status = 3 THEN 3
    WHEN datetime(b.end_time) < datetime('now') THEN 2
    ELSE b.status
END AS status
```

### `v_room_details`
Flat room model with aggregated assets.
- **Postgres:** Uses `json_agg(at.description)`
- **SQLite:** Uses `json_group_array(at.description)`
