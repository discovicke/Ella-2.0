<img width="1657" height="1167" alt="image" src="https://github.com/user-attachments/assets/7ebf8f87-31ae-4d8c-b2dc-11d7ee5b3099" />


### **1. Auth & Identity**

* **One User** has **One Role Level** (Student, Teacher, or Admin).
* **One User** has **Many Refresh Tokens** (active sessions on different devices).

### **2. Rooms & Equipment**

* **One Room** contains **Many Assets** (physical items inside).
* **One Asset Type** (e.g., "Projektor") defines **Many Assets** (many copies exist in different rooms).
* *Note: An "Asset" connects a specific Room to a specific Asset Type.*

### **3. Bookings & Participants**

* **One Room** hosts **Many Bookings** (scheduled at different times).
* **One User** (Host) organizes **Many Bookings**.
* **One Booking** has **Many Registrations** (a list of participants).
* **One User** holds **Many Registrations** (tickets for different events).

## **Technical Note on Dates**

**SQLite does not have a native `DATETIME` type.**

* **Storage:** Even though our schema uses `DATETIME`, SQLite actually stores these values as **TEXT** strings.
* **Format:** We strictly use the **ISO-8601** format: `"YYYY-MM-DD HH:MM:SS"`.
* **Why:** This specific string format is "lexicographically sortable" (meaning "2026..." correctly sorts after "2025...").
* **Developer Rule:** Always save dates as `DateTime.UtcNow` in C# to ensure the format remains consistent and sortable.


## SQL Schema
```sql
-- SQLite database export
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "registrations (join table)" (
    "user_id" INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    FOREIGN KEY("booking_id") REFERENCES "bookings"("id"),
    FOREIGN KEY("user_id") REFERENCES "users"("id")
);


CREATE TABLE IF NOT EXISTS "asset_types" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "description" TEXT NOT NULL UNIQUE
);


CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "role" INTEGER NOT NULL,
    "class" TEXT,
    "is_banned" INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS "assets" (
    "asset_id" INTEGER,
    "room_id" INTEGER,
    FOREIGN KEY("asset_id") REFERENCES "asset_types"("id"),
    FOREIGN KEY("room_id") REFERENCES "rooms"("id")
);


CREATE TABLE IF NOT EXISTS "rooms" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "type" INTEGER NOT NULL,
    "floor" TEXT,
    "address" TEXT,
    FOREIGN KEY("id") REFERENCES "bookings"("room_id")
);


CREATE TABLE IF NOT EXISTS "bookings" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" INTEGER,
    "room_id" INTEGER,
    "start_time" DATETIME NOT NULL,
    "end_time" DATETIME NOT NULL,
    "status" INT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME,
    FOREIGN KEY("user_id") REFERENCES "users"("id")
);


CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "revoked_at" DATETIME,
    "created_at" DATETIME NOT NULL,
    FOREIGN KEY("user_id") REFERENCES "users"("id")
);


COMMIT;
```
