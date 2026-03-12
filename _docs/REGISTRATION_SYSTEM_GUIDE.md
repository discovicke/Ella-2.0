# Registration & Invitation System

This document describes the registration/invitation system — how users get invited to bookings, RSVP, decline, and how the data flows from the database through the API to the frontend.

---

## Overview

Every booking can have **registrations** — rows that link a user to a booking with a status. The three statuses form a simple state machine:

```
  ┌──────────┐    AcceptInvitation    ┌────────────┐
  │ Invited  │ ──────────────────────►│ Registered │
  │  (0)     │◄───────────────────────│    (1)     │
  └──────────┘    AcceptInvitation    └────────────┘
       │            (re-accept)             │
       │                                    │
       │  Decline                           │  Decline
       ▼                                    ▼
  ┌──────────────────────────────────────────┐
  │               Declined (2)               │
  └──────────────────────────────────────────┘
       │
       │  AcceptInvitation (re-accept)
       ▼
  ┌────────────┐
  │ Registered │
  └────────────┘
```

Both "decline an invitation" and "unregister from a confirmed booking" lead to the same **Declined** state. The user can always re-accept later via `AcceptInvitation`.

| Status       | Enum value | Postgres type  | Meaning                              |
| ------------ | ---------- | -------------- | ------------------------------------ |
| `Invited`    | 0          | `'invited'`    | Pending — awaiting user response     |
| `Registered` | 1          | `'registered'` | Confirmed — user is attending        |
| `Declined`   | 2          | `'declined'`   | Declined — visible but not attending |

---

## Database

### Table

```sql
CREATE TABLE registrations (
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    status     registration_status NOT NULL DEFAULT 'invited',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, booking_id)
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
COUNT(reg.user_id) FILTER (WHERE reg.status = 'registered') AS registration_count,
COUNT(reg.user_id) FILTER (WHERE reg.status = 'invited')    AS invitation_count
```

---

## Backend

### Enum

```csharp
// Backend/app/Core/Models/Enums/RegistrationStatus.cs
public enum RegistrationStatus { Invited, Registered, Declined }
```

### Read Model

`BookingDetailedReadModel` includes an optional `UserRegistrationStatus` field (string: `"invited"`, `"registered"`, `"declined"`, or `null`). This is populated by the registration endpoints.

### Repository (IBookingReadModelRepository)

Supports both standard and paginated retrieval:

```csharp
Task<(IEnumerable<BookingDetailedReadModel> Bookings, int TotalCount)> 
    GetDetailedBookingsByUserRegistrationPagedAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        int page,
        int pageSize,
        string? timeFilter = null
    );
```

### Service (RegistrationService)

**Write operations**:

| Method                   | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| `AcceptInvitationAsync`  | Invited/Declined → Registered                         |
| `DeclineInvitationAsync` | Invited/Registered → Declined (covers unregister too) |
| `InviteUsersAsync`       | Creates rows with status = Invited                    |
| `RemoveInvitationAsync`  | Deletes the registration row (owner action)           |

**Read operation** (Paginated):

```csharp
Task<(IEnumerable<BookingDetailedReadModel> Bookings, int TotalCount)> 
    GetUserRegistrationBookingsPagedAsync(
        long userId,
        IEnumerable<RegistrationStatus> statuses,
        int page,
        int pageSize,
        string? timeFilter = null
    );
```

### API Endpoint

**Unified paginated endpoint** — replaces the previous individual list calls:

```
GET /api/bookings/my-registration-bookings?statuses=registered,invited&timeFilter=upcoming&page=1&pageSize=20
```

| Query Param  | Type   | Default | Description                                                 |
| ------------ | ------ | ------- | ----------------------------------------------------------- |
| `statuses`   | string | all     | Comma-separated: `invited`, `registered`, `declined`        |
| `timeFilter` | string | all     | `upcoming` (end_time ≥ now) or `history` (< now)            |
| `page`       | int    | 1       | 1-based page number                                         |
| `pageSize`   | int    | 20      | Items per page (max 100)                                    |

---

## Frontend

### Service (RegistrationService)

```typescript
getMyRegistrationBookings(
  statuses: string[],
  timeFilter?: 'upcoming' | 'history',
  page?: number,
  pageSize?: number
): Observable<PagedResult<BookingDetailedReadModel>>
```

### See Bookings Page — Data Loading

The page uses the **Load-more** pattern, fetching pages as the user clicks "Ladda fler". It makes parallel calls for owned bookings and registration bookings, then merges and deduplicates them in the signal.

---

## Design Decisions

### Why paginated registration bookings?

As of March 2026, we implemented server-side pagination for registrations to support users with high event volume (e.g., active students or managers attending many meetings). This ensures the "See Bookings" page remains performant even with thousands of registrations.

### Why keep `userRegistrationStatus` on the read model?

The unified endpoint returns mixed-status bookings. Without this field, the frontend would need a separate way to determine which bookings are invited vs registered vs declined. Adding it to the response lets the frontend partition results in a single pass.
