-- TODO: Review and update schema if needed
-- Compare with old schema: db/schema.sql
-- Document any breaking changes

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;
-- 0. Versioning
CREATE TABLE IF NOT EXISTS database_versions
(
    version    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. Users & Auth
CREATE TABLE IF NOT EXISTS "users"
(
    "id"                 INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "email"              TEXT                              NOT NULL UNIQUE,
    "password_hash"      TEXT                              NOT NULL,
    "display_name"       TEXT,
    "role"               INTEGER                           NOT NULL, -- 0=Student, 1=Teacher, 2=Admin
    "user_class"         TEXT,
    "is_banned"          INTEGER                           NOT NULL DEFAULT 0,
    "tokens_valid_after" DATETIME                                   DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Rooms & Equipment
CREATE TABLE IF NOT EXISTS "rooms"
(
    "id"       INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name"     TEXT                              NOT NULL,
    "capacity" INTEGER,
    "type"     INTEGER                           NOT NULL,
    "floor"    TEXT,
    "address"  TEXT,
    "notes"    TEXT
    -- REMOVED: Circular FK to bookings
);

CREATE TABLE IF NOT EXISTS "asset_types"
(
    "id"          INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "description" TEXT                              NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "room_assets"
(
    "id"            INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- Added PK for the specific physical item
    "asset_type_id" INTEGER                           NOT NULL, -- Renamed from asset_id for clarity
    "room_id"       INTEGER                           NOT NULL,
    FOREIGN KEY ("asset_type_id") REFERENCES "asset_types" ("id"),
    FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE
);

-- 3. Bookings & Participants
CREATE TABLE IF NOT EXISTS "bookings"
(
    "id"         INTEGER PRIMARY KEY AUTOINCREMENT  NOT NULL,
    "user_id"    INTEGER                            NOT NULL, -- The Host
    "room_id"    INTEGER                            NOT NULL,
    "start_time" DATETIME                           NOT NULL,
    "end_time"   DATETIME                           NOT NULL,
    "status"     INTEGER                            NOT NULL,
    "notes"      TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" DATETIME,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id"),
    FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "registrations"
(
    "user_id"    INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    -- Composite Primary Key ensures a user can't register for the same booking twice
    PRIMARY KEY ("user_id", "booking_id"),
    FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);

COMMIT;