# Scalability Fixes — TODO

> Created: 2026-03-04
> Context: Audit for ~5,000 DAU. Two critical items to fix first.

---

## C1: Paginate `/my-registration-bookings` (CRITICAL)

**Problem:** The endpoint returns ALL bookings a user has been invited/registered to with no `LIMIT`. Every user hits this on every page load via the `Promise.all` merge in `see-bookings.page.ts`. Queries `v_bookings_detailed` (6-table JOIN + GROUP BY + correlated subquery) — payload grows forever as registrations accumulate.

**Files to change:**

### Backend

1. **`Backend/app/Core/Interfaces/IBookingReadModelRepository.cs`**
   - Add paged variant:
     ```csharp
     Task<(IEnumerable<BookingDetailedReadModel> Bookings, int TotalCount)>
         GetDetailedBookingsByUserRegistrationPagedAsync(
             long userId, IEnumerable<RegistrationStatus> statuses,
             int page, int pageSize, string? timeFilter = null);
     ```

2. **`Backend/app/Infrastructure/Repositories/Postgres/PostgresBookingReadModelRepo.cs`**
   - Implement the paged method: add `COUNT(*)` query + `LIMIT @PageSize OFFSET @Offset` to the existing SQL pattern in `GetDetailedBookingsByUserRegistrationAsync`.

3. **`Backend/app/Infrastructure/Repositories/Sqlite/SqliteBookingReadModelRepo.cs`**
   - Same as Postgres but with SQLite syntax (`datetime('now')`, `IN @Statuses`, integer status values).

4. **`Backend/app/Core/Services/RegistrationService.cs`**
   - Add `GetUserRegistrationBookingsPagedAsync(userId, statuses, page, pageSize, timeFilter)` that calls the new repo method and returns `(IEnumerable<BookingDetailedReadModel>, int TotalCount)`.

5. **`Backend/app/API/Endpoints/RegistrationEndpoints.cs`** (lines ~158-206)
   - Add `int? page, int? pageSize` query params to the `/my-registration-bookings` handler.
   - Default: `page=1`, `pageSize=20`, clamp pageSize to 1-100.
   - Return `{ items, totalCount, page, pageSize }` instead of bare array.

### Frontend

6. **`Frontend/ng.Frontend/src/app/shared/services/registration.service.ts`**
   - Update `getMyRegistrationBookings()` to accept `page`/`pageSize` params and return `PagedResultOfBookingDetailedReadModel` instead of `BookingDetailedReadModel[]`.

7. **`Frontend/ng.Frontend/src/app/pages/main/see-bookings/see-bookings.page.ts`** (lines ~252-290)
   - Update `loadBookings()` to pass `page`/`pageSize` to the registration service call.
   - Handle paged response: use `items` array and `totalCount` for "load more" logic.
   - Adjust the merge/dedup logic to account for both paged sources.

---

## C2: Scope user associations to current page (CRITICAL)

**Problem:** `UserService.GetAllPagedAsync()` calls `GetAllUserCampusNamesAsync()` and `GetAllUserClassNamesAsync()` which load EVERY user-campus and user-class mapping in the entire database — even when only showing 25 users per page. At 5,000 users × 1-3 associations each = 5,000-15,000 rows loaded and discarded per request.

**Files to change:**

### Backend

1. **`Backend/app/Core/Interfaces/IUserRepository.cs`**
   - Add scoped variants:
     ```csharp
     Task<Dictionary<long, List<string>>> GetUserCampusNamesAsync(IEnumerable<long> userIds);
     Task<Dictionary<long, List<string>>> GetUserClassNamesAsync(IEnumerable<long> userIds);
     ```

2. **`Backend/app/Infrastructure/Repositories/Postgres/PostgresUserRepo.cs`** (near lines 267 and 351)
   - Implement both methods: same SQL as `GetAllUser*NamesAsync` but add `WHERE uc.user_id = ANY(@UserIds)`.

3. **`Backend/app/Infrastructure/Repositories/Sqlite/SqliteUserRepo.cs`** (near lines 265 and 349)
   - Same but with `WHERE uc.user_id IN @UserIds` (Dapper SQLite syntax).

4. **`Backend/app/Core/Services/UserService.cs`** (lines 72-73)
   - In `GetAllPagedAsync()`, extract user IDs from the paged result:
     ```csharp
     var userIds = userList.Select(u => u.Id).ToList();
     var campusNames = await repo.GetUserCampusNamesAsync(userIds);
     var classNames = await repo.GetUserClassNamesAsync(userIds);
     ```
   - Keep `GetAllAsync()` using the unscoped `GetAll*` variants (or scope it too if desired).

---

## Lower Priority (for later)

| Severity | Issue                                                        | Quick Fix                                                          |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| MEDIUM   | No rate limiting on authenticated endpoints or `/auth/login` | Add per-user 100 req/min + login 10 attempts/15min in `Program.cs` |
| MEDIUM   | No JWT refresh token — users re-login every 60min            | Implement `/auth/refresh` with server-side refresh token           |
| MEDIUM   | `v_bookings_detailed` correlated subquery for room assets    | Refactor to lateral join or CTE                                    |
| MEDIUM   | SQLite schema missing 4 indexes that PostgreSQL has          | Add matching indexes to `SqliteSchema.sqlite`                      |
| LOW      | No response compression (gzip)                               | Add `UseResponseCompression()` in `Program.cs`                     |
| LOW      | No frontend caching for reference data (rooms, campuses)     | `shareReplay(1)` or signal cache with TTL                          |
| LOW      | `GET /api/rooms` loads ALL rooms, filters in C#              | Push WHERE clauses into SQL in room repos                          |
| LOW      | `OFFSET` pagination degrades at depth                        | Migrate to keyset/cursor pagination long-term                      |
