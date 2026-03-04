# Scalability Fixes — TODO

> Created: 2026-03-04
> Context: Audit for ~5,000 DAU. Two critical items to fix first.

---

## ~~C1: Paginate `/my-registration-bookings`~~ ✅ DONE

> Completed: 2026-03-04

- Added `GetDetailedBookingsByUserRegistrationPagedAsync` to `IBookingReadModelRepository`
- Implemented paged queries (COUNT + LIMIT/OFFSET) in both Postgres and SQLite repos
- Added `GetUserRegistrationBookingsPagedAsync` to `RegistrationService`
- Endpoint now accepts `page`/`pageSize` query params (default 1/20, clamped 1–100)
- Returns `{ items, totalCount, page, pageSize }` instead of bare array
- Frontend `registration.service.ts` updated to pass page/pageSize and return `PagedResultOfBookingDetailedReadModel`
- `see-bookings.page.ts` passes pagination to both parallel calls and uses paged totalCount

---

## ~~C2: Scope user associations to current page~~ ✅ DONE

> Completed: 2026-03-04

- Added `GetUserCampusNamesAsync(userIds)` and `GetUserClassNamesAsync(userIds)` to `IUserRepository`
- Implemented scoped queries in Postgres (`ANY(@UserIds)`) and SQLite (`IN @UserIds`) repos
- `UserService.GetAllPagedAsync()` now extracts page user IDs and fetches only their associations
- `GetAllAsync()` still uses the unscoped `GetAll*` variants

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
