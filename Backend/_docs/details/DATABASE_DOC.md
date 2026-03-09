# Database Schema Documentation

> **Source of truth:** [`SqliteSchema.sqlite`](../../app/Infrastructure/Data/SqliteSchema.sqlite) (SQLite) and [`PostgresSchema.sql`](../../app/Infrastructure/Data/PostgresSchema.sql) (PostgreSQL).

<!-- dbdocs-link:start -->
> Schema diagram is auto-published via GitHub Actions when schema changes are pushed to main.
<!-- dbdocs-link:end -->

---

## Relationship Overview

### **1. Auth & Identity**

- **One User** belongs to **One Permission Template** (Role) OR acts as a **Custom User** (No Template).
- **Security Strategy:**
  - **Passwords** are hashed using **Argon2** (via `IPasswordHasher`).
  - **Sessions** are stateless using JWTs. Global logout (revocation) is handled by the `tokens_valid_after` timestamp. Any JWT issued before this timestamp is considered invalid.

### **2. Campus, Classes & Users**

- **One Campus** contains **Many Rooms**. Rooms are linked to a campus via `campus_id`.
- **One Class** is linked to **Many Campuses** via the `class_campus` bridge table.
- **Users** can belong to **Many Classes** (via `user_class`) and **Many Campuses** (via `user_campus`).

### **3. Rooms & Equipment**

- **One Room Type** categorizes **Many Rooms** via `room_type_id` (room types are a separate table, not an enum).
- **One Room** contains **Many Assets** (physical items inside).
- **One Asset Type** (e.g., "Projektor") defines **Many Assets** (many copies exist in different rooms).
- _Note: An "Asset" (`room_assets`) connects a specific Room to a specific Asset Type._

### **4. Bookings & Registrations**

- **One Room** hosts **Many Bookings** (scheduled at different times).
- **One User** (Host) organizes **Many Bookings**.
- **One Booking** has **Many Registrations** (a list of participants).
- **One User** holds **Many Registrations** (tickets for different events).
- Registrations have a **status** column: `0 = Invited`, `1 = Registered`, `2 = Declined`.

---

## Technical Note on Dates

The project supports both **SQLite** and **PostgreSQL**. Date handling differs by provider:

### SQLite

- SQLite does not have a native `DATETIME` type. Values are stored as **TEXT** strings in **ISO-8601** format: `"YYYY-MM-DD HH:MM:SS"`.
- This format is "lexicographically sortable" (meaning "2026..." correctly sorts after "2025...").

### PostgreSQL

- PostgreSQL uses native `TIMESTAMPTZ` columns. Dates are stored with timezone awareness.

### Developer Rule

Always save dates as `DateTime.UtcNow` in C# to ensure consistency across both providers.

---

## SQL Schema (SQLite)

> Shown in SQLite dialect. The PostgreSQL schema is structurally identical but uses native types (`SERIAL`, `TIMESTAMPTZ`, etc.).

### 0. Versioning

```sql
CREATE TABLE IF NOT EXISTS database_versions (
    version INTEGER PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 1. Organization — Campus & Classes

```sql
CREATE TABLE IF NOT EXISTS campus (
    id      INTEGER PRIMARY KEY,
    street  TEXT NOT NULL,
    zip     TEXT,
    city    TEXT NOT NULL,
    country TEXT NOT NULL,
    contact TEXT
);

CREATE TABLE IF NOT EXISTS class (
    id         INTEGER PRIMARY KEY,
    class_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_campus (
    id        INTEGER PRIMARY KEY,
    class_id  INTEGER NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    campus_id INTEGER NOT NULL REFERENCES campus(id) ON DELETE CASCADE,
    UNIQUE(class_id, campus_id)
);
```

### 2. Users & Associations

```sql
CREATE TABLE IF NOT EXISTS users (
    id                     INTEGER PRIMARY KEY,
    email                  TEXT NOT NULL UNIQUE,
    password_hash          TEXT NOT NULL,
    display_name           TEXT,
    is_banned              INTEGER NOT NULL DEFAULT 0,
    tokens_valid_after     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    permission_template_id INTEGER REFERENCES permission_templates(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_class (
    id       INTEGER PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES class(id),
    user_id  INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_campus (
    id        INTEGER PRIMARY KEY,
    user_id   INTEGER NOT NULL REFERENCES users(id),
    campus_id INTEGER NOT NULL REFERENCES campus(id)
);
```

### 3. Permission System (RBAC)

```sql
CREATE TABLE IF NOT EXISTS system_permissions (
    key         TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permission_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    label      TEXT NOT NULL,
    css_class  TEXT,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS permission_template_flags (
    template_id    INTEGER NOT NULL,
    permission_key TEXT NOT NULL,
    value          INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (template_id, permission_key),
    FOREIGN KEY (template_id) REFERENCES permission_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_key) REFERENCES system_permissions(key) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_permission_overrides (
    user_id        INTEGER NOT NULL,
    permission_key TEXT NOT NULL,
    value          INTEGER NOT NULL,
    PRIMARY KEY (user_id, permission_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_key) REFERENCES system_permissions(key) ON DELETE CASCADE
);
```

See [PERMISSION_SYSTEM_GUIDE.md](./PERMISSION_SYSTEM_GUIDE.md) for the full explanation of how templates, overrides, and the effective view interact.

### 4. Rooms & Equipment

```sql
CREATE TABLE IF NOT EXISTS room_types (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    id           INTEGER PRIMARY KEY,
    campus_id    INTEGER NOT NULL REFERENCES campus(id),
    name         TEXT NOT NULL,
    capacity     INTEGER,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id),
    floor        TEXT,
    notes        TEXT
);

CREATE TABLE IF NOT EXISTS asset_types (
    id          INTEGER PRIMARY KEY,
    description TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS room_assets (
    id            INTEGER PRIMARY KEY,
    asset_type_id INTEGER NOT NULL REFERENCES asset_types(id),
    room_id       INTEGER NOT NULL REFERENCES rooms(id),
    notes         TEXT
);
```

### 5. Bookings & Registrations

```sql
CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    room_id     INTEGER NOT NULL REFERENCES rooms(id),
    start_time  TEXT NOT NULL,
    end_time    TEXT NOT NULL,
    status      INTEGER NOT NULL DEFAULT 0,    -- 0=Active, 1=Cancelled, 3=Expired (2=computed)
    notes       TEXT,
    booker_name TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT
);

-- status: 0 = Invited, 1 = Registered, 2 = Declined
CREATE TABLE IF NOT EXISTS registrations (
    user_id    INTEGER NOT NULL REFERENCES users(id),
    booking_id INTEGER NOT NULL REFERENCES bookings(id),
    status     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_user_status
    ON registrations (user_id, status);
```

```sql
CREATE TABLE IF NOT EXISTS booking_class (
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    class_id   INTEGER NOT NULL REFERENCES class(id) ON DELETE CASCADE,
    PRIMARY KEY (booking_id, class_id)
);
```

### 6. Views

#### `v_user_effective_permissions`

Resolves the 3-layer priority chain: override → template flag → default FALSE.

```sql
CREATE VIEW v_user_effective_permissions AS
SELECT
    u.id AS user_id,
    sp.key AS permission_key,
    COALESCE(upo.value, ptf.value, 0) AS is_granted
FROM users u
CROSS JOIN system_permissions sp
LEFT JOIN permission_templates pt ON u.permission_template_id = pt.id
LEFT JOIN permission_template_flags ptf ON pt.id = ptf.template_id AND ptf.permission_key = sp.key
LEFT JOIN user_permission_overrides upo ON u.id = upo.user_id AND upo.permission_key = sp.key;
```

#### `v_bookings_detailed`

Enriched booking view used by the booking read-model repository. Includes user/room/campus info, computed `expired` status, and aggregated `registration_count`, `invitation_count`, and `room_assets`.

```sql
CREATE VIEW v_bookings_detailed AS
SELECT
    b.id AS booking_id,
    b.user_id, u.display_name AS user_name, u.email AS user_email,
    b.room_id, r.name AS room_name, r.capacity AS room_capacity,
    rt.name AS room_type, r.floor AS room_floor, c.city AS campus_city,
    b.start_time, b.end_time,
    CASE
        WHEN b.status = 1 THEN 1
        WHEN b.status = 3 THEN 3
        WHEN datetime(b.end_time) < datetime('now') THEN 2
        ELSE b.status
    END AS status,
    b.notes, b.booker_name, b.created_at, b.updated_at,
    COALESCE(SUM(CASE WHEN reg.status = 1 THEN 1 ELSE 0 END), 0) AS registration_count,
    COALESCE(SUM(CASE WHEN reg.status = 0 THEN 1 ELSE 0 END), 0) AS invitation_count,
    (SELECT CASE WHEN COUNT(*) > 0 THEN json_group_array(at.description) ELSE NULL END
     FROM room_assets ra JOIN asset_types at ON ra.asset_type_id = at.id
     WHERE ra.room_id = b.room_id) AS room_assets,
    (SELECT CASE WHEN COUNT(*) > 0 THEN json_group_array(cl.class_name) ELSE NULL END
     FROM booking_class bc JOIN class cl ON bc.class_id = cl.id
     WHERE bc.booking_id = b.id) AS class_names
FROM bookings b
LEFT JOIN users u ON b.user_id = u.id
LEFT JOIN rooms r ON b.room_id = r.id
LEFT JOIN room_types rt ON r.room_type_id = rt.id
LEFT JOIN campus c ON r.campus_id = c.id
LEFT JOIN registrations reg ON b.id = reg.booking_id
GROUP BY b.id;
```

#### `v_room_details`

Room read-model with campus city, room type, and JSON array of asset descriptions.

```sql
CREATE VIEW v_room_details AS
SELECT
    r.id AS RoomId, r.campus_id AS CampusId, r.name AS Name,
    c.city AS CampusCity, r.capacity AS Capacity,
    r.room_type_id AS RoomTypeId, rt.name AS RoomTypeName,
    r.floor AS Floor, r.notes AS Notes,
    CASE WHEN COUNT(at.description) > 0
         THEN json_group_array(at.description)
         ELSE NULL END AS AssetsString
FROM rooms r
LEFT JOIN campus c ON r.campus_id = c.id
LEFT JOIN room_types rt ON r.room_type_id = rt.id
LEFT JOIN room_assets ra ON r.id = ra.room_id
LEFT JOIN asset_types at ON ra.asset_type_id = at.id
GROUP BY r.id;
```
