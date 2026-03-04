# Registration & Invitation System

This document describes the registration/invitation system — how users get invited to bookings, RSVP, decline, and how the data flows from the database through the API to the frontend.

---

## Overview

Every booking can have **registrations** — rows that link a user to a booking with a status. The three statuses form a simple state machine:

```
                ┌──────────────────────────────┐
                │                              │
                ▼                              │
  ┌──────────┐    AcceptInvitation    ┌────────────┐
  │ Invited  │ ──────────────────────►│ Registered │
  │  (0)     │                        │    (1)     │
  └──────────┘                        └────────────┘
       │                                    │
       │  DeclineInvitation                 │  Unregister
       ▼                                    ▼
  ┌──────────┐                        ┌──────────┐
  │ Declined │◄───────────────────────│ Invited  │
  │   (2)    │    (reverts to         │  (back)  │
  └──────────┘     invited)           └──────────┘
       │
       │  AcceptInvitation (re-accept)
       ▼
  ┌────────────┐
  │ Registered │
  └────────────┘
```

| Status       | Enum value | Postgres type           | Meaning                              |
| ------------ | ---------- | ----------------------- | ------------------------------------ |
| `Invited`    | 0          | `'invited'`             | Pending — awaiting user response     |
| `Registered` | 1          | `'registered'`          | Confirmed — user is attending        |
| `Declined`   | 2          | `'declined'`            | Declined — visible but not attending |

---

## Database

### Table

```sql
CREATE TABLE registrations (
    id          BIGSERIAL PRIMARY KEY,
    booking_id  BIGINT NOT NULL REFERENCES bookings(id),
    user_id     BIGINT NOT NULL REFERENCES users(id),
    status      registration_status NOT NULL DEFAULT 'invited',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (booking_id, user_id)
);
```

### Index

```sql
CREATE INDEX idx_registrations_user_status ON registrations (user_id, status);
```

This composite index supports the unified registration query which filters by `(user_id, status)` — the most common access pattern on the "See Bookings" page.

### View

Registration counts are pre-aggregated in `v_bookings_detailed`:

```sql
COUNT(DISTINCT CASE WHEN r.status = 'registered' THEN r.id END) AS registration_count,
COUNT(DISTINCT CASE WHEN r.status = 'invited'    THEN r.id END) AS invitation_count
```

---

## Backend

### Enum

```csharp
// Backend/app/Core/Models/Enums/RegistrationStatus.cs
public enum RegistrationStatus { Invited, Registered, Declined }
```

### Read Model

`BookingDetailedReadModel` includes an optional `UserRegistrationStatus` field (string: `"invited"`, `"registered"`, `"declined"`, or `null`). This is only populated by the unified registration endpoint — not by general booking queries.

### Repository (IBookingReadModelRepository)

One parameterised method replaces what was previously three separate methods:

```csharp
Task<IEnumerable<BookingDetailedReadModel>> GetDetailedBookingsByUserRegistrationAsync(
    long userId,
    IEnumerable<RegistrationStatus> statuses,
    string? timeFilter = null   // "upcoming" | "history" | null
);
```

**Implementation details:**

| DB engine  | Status filter                            | Time function      |
| ---------- | ---------------------------------------- | ------------------ |
| PostgreSQL | `ANY(@Statuses::registration_status[])` | `NOW()`            |
| SQLite     | `IN @Statuses` (integer array)           | `datetime('now')`  |

The query also selects `r.status` as `user_registration_status` so each returned booking carries the user's registration status.

### Service (RegistrationService)

**Write operations** (unchanged):

| Method                  | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `AcceptInvitationAsync` | Invited/Declined → Registered                     |
| `UnregisterAsync`       | Registered → Invited (reverts, keeps the row)     |
| `DeclineInvitationAsync`| Invited → Declined                                |
| `InviteUsersAsync`      | Creates rows with status = Invited                |
| `RemoveInvitationAsync` | Deletes the registration row (owner action)       |

**Read operation** (consolidated):

```csharp
Task<IEnumerable<BookingDetailedReadModel>> GetUserRegistrationBookingsAsync(
    long userId,
    IEnumerable<RegistrationStatus> statuses,
    string? timeFilter = null
);
```

### API Endpoint

**Unified endpoint** — replaces the previous `/my-registrations`, `/my-invitations`, `/my-declined`:

```
GET /api/bookings/my-registration-bookings?statuses=registered,invited,declined&timeFilter=upcoming
```

| Query Param  | Type   | Default | Description                                                |
| ------------ | ------ | ------- | ---------------------------------------------------------- |
| `statuses`   | string | all     | Comma-separated: `invited`, `registered`, `declined`       |
| `timeFilter` | string | all     | `upcoming` (end_time ≥ now, ASC) or `history` (< now, DESC)|

**Other registration endpoints** (unchanged):

| Method | Path                                       | Description                          |
| ------ | ------------------------------------------ | ------------------------------------ |
| POST   | `/api/bookings/{id}/register`              | Accept invite / RSVP                 |
| DELETE | `/api/bookings/{id}/register`              | Unregister (reverts to invited)      |
| POST   | `/api/bookings/{id}/decline`               | Decline invitation                   |
| POST   | `/api/bookings/{id}/invite`                | Invite users (body: `{ userIds }`)   |
| DELETE | `/api/bookings/{id}/invitations/{userId}`  | Remove invitation (owner only)       |
| GET    | `/api/bookings/{id}/registrations`         | List confirmed participants          |
| GET    | `/api/bookings/{id}/invitations`           | List pending invitations             |

---

## Frontend

### Service (RegistrationService)

One method replaces the previous three:

```typescript
getMyRegistrationBookings(
  statuses: string[],          // ['registered', 'invited', 'declined']
  timeFilter?: 'upcoming' | 'history'
): Observable<BookingDetailedReadModel[]>
```

### See Bookings Page — Data Loading

The page makes **2 parallel API calls** per load (down from 4):

```
Promise.all([
  1. GET /api/bookings/my-owned?page=N&timeFilter=...         ← paged own bookings
  2. GET /api/bookings/my-registration-bookings?statuses=...  ← unified registrations
])
```

The server handles time filtering, so no client-side date comparisons are needed.

### Enrichment

Each booking is enriched with metadata based on `userRegistrationStatus` from the API response:

| `userRegistrationStatus` | Tab      | Enrichment source    | UI treatment                              |
| ------------------------ | -------- | -------------------- | ----------------------------------------- |
| `'registered'`           | both     | `'registered'`       | Blue accent, "Du deltar" in modal         |
| `'invited'`              | upcoming | `'invitation'`       | Green accent, accept/decline buttons      |
| `'invited'`              | history  | `'expired-invitation'`| Grey accent, no actions                  |
| `'declined'`             | both     | `'declined'`         | Red accent, re-accept option in modal     |
| *(own booking)*          | both     | `'owned'`            | Purple accent, cancel/edit actions        |

### Deduplication

Own bookings and registration bookings can overlap (user is owner AND has a registration). The merge logic deduplicates by `bookingId`, preferring the "owned" enrichment since it carries edit/cancel capabilities.

### Visual Indicators

Each registration status has distinct styling in the booking list:

| Status     | Left accent color | Origin tag         |
| ---------- | ----------------- | ------------------ |
| Owned      | Purple (default)  | —                  |
| Registered | Blue              | "Du deltar"        |
| Invitation | Green             | "Ny inbjudan"      |
| Declined   | Red               | "Avböjd"           |

Invitations show inline **Acceptera** / **Avböj** buttons directly in the booking row.

---

## Design Decisions

### Why one unified endpoint instead of three?

1. **Fewer HTTP round-trips** — 1 request instead of 3 for the same data
2. **Server-side time filtering** — DB only returns relevant rows, no wasted transfer
3. **DRY** — one repo method, one service method, one endpoint instead of three near-identical copies
4. **Composable** — caller decides which statuses to include; the backend doesn't need a new endpoint for each combination

### Why keep `userRegistrationStatus` on the read model?

The unified endpoint returns mixed-status bookings. Without this field, the frontend would need a separate way to determine which bookings are invited vs registered vs declined. Adding it to the response (populated only by the registration query) lets the frontend partition results in a single pass.

### Why not paginate registration bookings?

Registration counts per user are naturally bounded — a user can realistically have at most ~50-100 active registrations across all bookings. The own-bookings endpoint is paginated because users can create hundreds of bookings over time. If registration volume grows, pagination can be added to the unified endpoint without changing the frontend contract.
