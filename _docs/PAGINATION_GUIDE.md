# Pagination System

This document explains how server-side pagination is implemented across the backend and frontend, how they communicate, and the design decisions behind the approach.

---

## Overview

Pagination is applied to **users** and **bookings** — the two entities that grow unboundedly. Other entities (rooms, campuses, classes, roles) use client-side pagination since their dataset sizes are naturally small.

There are two pagination patterns in the frontend:

| Pattern       | Used by                       | Description                                                |
| ------------- | ----------------------------- | ---------------------------------------------------------- |
| **Page-flip** | Manage Users, Manage Bookings | Classic prev/next with `app-table` component               |
| **Load-more** | See Bookings (my bookings)    | Accumulates results, "Ladda fler" button appends next page |

---

## Backend

### Shared Response Wrapper

All paginated endpoints return the same generic wrapper:

```csharp
// Backend/app/Core/Models/DTO/PagedResult.cs
public record PagedResult<T>(
    IEnumerable<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
```

### Paginated Endpoints

#### `GET /api/users`

| Query Param  | Type   | Default | Description                                      |
| ------------ | ------ | ------- | ------------------------------------------------ |
| `page`       | int    | 1       | 1-based page number                              |
| `pageSize`   | int    | 25      | Items per page                                   |
| `search`     | string | —       | Searches `display_name` and `email` (ILIKE/LIKE) |
| `templateId` | long   | —       | Filter by permission template ID                 |
| `isBanned`   | string | —       | `"Banned"` or `"Active"`                         |

Returns `PagedResult<UserResponseDto>`.

#### `GET /api/bookings`

| Query Param | Type   | Default | Description                            |
| ----------- | ------ | ------- | -------------------------------------- |
| `page`      | int    | 1       | 1-based page number                    |
| `pageSize`  | int    | 25      | Items per page                         |
| `search`    | string | —       | Searches room name, booker name, email |
| `status`    | string | —       | Booking status filter                  |
| `startDate` | string | —       | ISO date lower bound                   |
| `endDate`   | string | —       | ISO date upper bound                   |

Returns `PagedResult<BookingDetailedReadModel>`.

#### `GET /api/bookings/my-owned`

| Query Param        | Type   | Default | Description                 |
| ------------------ | ------ | ------- | --------------------------- |
| `page`             | int    | 1       | 1-based page number         |
| `pageSize`         | int    | 20      | Items per page              |
| `timeFilter`       | string | —       | `"upcoming"` or `"history"` |
| `includeCancelled` | bool   | `false` | Include cancelled bookings  |

Returns `PagedResult<BookingDetailedReadModel>`.

#### `GET /api/bookings` (Grouped)

When the `groupBy` parameter is used, the endpoint returns a `GroupedPagedResult`. This paginates by unique groups (e.g., 10 rooms per page) and returns all bookings for those groups.

| Query Param | Type   | Description                                      |
| ----------- | ------ | ------------------------------------------------ |
| `groupBy`   | string | `room`, `user`, `campus`, `day`, `week`, `month` |

### Architecture Flow

```
Endpoint → Service → Repository → SQL (COUNT + LIMIT/OFFSET)
```

Each repository method executes **two queries** in one round-trip:

1. `SELECT COUNT(*)` with the same WHERE clause (for `TotalCount`)
2. `SELECT ... LIMIT @pageSize OFFSET @offset` (for `Items`)

Both Postgres and SQLite repositories implement the same interface. Key differences:

- Postgres uses `ILIKE` for case-insensitive search, SQLite uses `LIKE`
- Postgres uses `::booking_status` type casts, SQLite uses plain strings
- Postgres uses `$1` parameter syntax internally via Dapper, SQLite uses `@param`

### Adding Pagination to a New Endpoint

1. Add a paged method to the repository interface (e.g., `GetEntitiesPagedAsync`)
2. Implement in both `Postgres*Repo.cs` and `Sqlite*Repo.cs` with COUNT + LIMIT/OFFSET
3. Add a service method that delegates to the repository and returns `PagedResult<T>`
4. Update the endpoint to accept `page` and `pageSize` query params and call the service

---

## Frontend

### Shared Types

```typescript
// models.ts
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
```

This mirrors the backend `PagedResult<T>` exactly (property names are camelCased by the JSON serializer).

### Services

Each service wraps the HTTP call and passes pagination + filter params:

```typescript
// user.service.ts
getAllUsers(params?: UserPagedParams): Observable<PagedResult<UserResponseDto>>

// booking.service.ts
getAllBookings(filters?: BookingPagedFilterParams): Observable<PagedResult<BookingDetailedReadModel>>
getBookingsByUserId(params?: MyBookingsParams): Observable<PagedResult<BookingDetailedReadModel>>
```

Query params are built with `HttpParams` and only set if a value is provided (no `undefined` or empty strings sent to the backend).

---

## Page-Flip Pattern (Manage Users, Manage Bookings)

### How It Works

The page component holds pagination state as **signals**:

```typescript
pageIndex = signal(0); // 0-based in frontend, converted to 1-based for API
pageSize = signal(0); // starts at 0 when autoSize is used; set by app-table
```

A `resource()` watches these signals and fetches when any param changes:

```typescript
userResource = resource({
  params: () => {
    const ps = this.pageSize();
    if (ps === 0) return undefined; // don't fetch until autoSize provides a value
    return {
      page: this.pageIndex() + 1, // convert to 1-based for API
      pageSize: ps,
      search: this.debouncedSearch(),
      // ...other filters
    };
  },
  loader: ({ params }) => firstValueFrom(this.userService.getAllUsers(params)),
});
```

**Key detail**: returning `undefined` from `params` prevents the resource from loading. This is how `pageSize = signal(0)` defers the first fetch until `app-table`'s autoSize calculates the real page size.

### Flash Prevention

When the resource reloads (page change, filter change), `value()` briefly becomes `undefined`. To prevent the table from flashing empty, previous data is cached:

```typescript
private lastUsers: UserResponseDto[] = [];
private lastTotal = 0;

paginatedUsers = computed(() => {
  const val = this.userResource.value();
  if (val) {
    this.lastUsers = val.items;
    this.lastTotal = val.totalCount;
  }
  return this.lastUsers;       // returns previous data while loading
});
```

Combined with the table's CSS opacity transition (`opacity: 0.5` while loading), this creates a smooth dim-and-replace effect instead of a jarring flash.

### Search Debouncing

Search input uses a 300ms debounce to avoid firing a request on every keystroke:

```typescript
searchQuery = signal('');
debouncedSearch = signal('');
private debounceTimer: any;

onSearchChange(value: string) {
  this.searchQuery.set(value);
  clearTimeout(this.debounceTimer);
  this.debounceTimer = setTimeout(() => {
    this.debouncedSearch.set(value);
    this.pageIndex.set(0);         // reset to first page on new search
  }, 300);
}
```

The `resource` watches `debouncedSearch`, not `searchQuery`, so the HTTP request only fires after the user stops typing.

---

## Load-More Pattern (See Bookings)

### How It Works

Instead of `resource()`, this page uses manual signals + an `effect()`:

```typescript
bookings = signal<BookingDetailedReadModel[]>([]);   // accumulated results
totalCount = signal(0);
currentPage = signal(1);
isLoading = signal(false);
readonly PAGE_SIZE = 20;
```

The `effect()` watches `activeTab()` and `showCancelled()` and resets:

```typescript
effect(() => {
  this.activeTab();
  this.showCancelled();
  untracked(() => this.loadBookings(true)); // reset = true → clear & reload
});
```

`loadBookings(reset)` fetches a page and either replaces or appends:

```typescript
async loadBookings(reset: boolean) {
  if (reset) {
    this.currentPage.set(1);
    this.bookings.set([]);
  }
  // fetch page...
  if (reset) {
    this.bookings.set(result.items);
  } else {
    this.bookings.update(prev => [...prev, ...result.items]);  // append
  }
  this.totalCount.set(result.totalCount);
}
```

The "Ladda fler" button calls `loadMore()` which increments the page and appends.

### Why Not `resource()`?

The load-more pattern **accumulates** data across pages. `resource()` replaces its value on every reload, which would clear previously loaded items. Manual signals give full control over the append behavior.

---

## `app-table` Component — AutoSize

### Problem

Admin tables should fill the available screen height. The number of visible rows depends on screen size (1080p vs 4K), sidebar state, and row height (which varies per table — e.g., tables with avatars have taller rows).

### Solution

`app-table` accepts an `autoSize` input. When enabled, it calculates how many rows fit using:

```
fitRows = floor((bodyHeight - headerHeight) / rowHeight)
```

Where:

- `bodyHeight` = the `.table-body` flex child's height (set by CSS flexbox, independent of content)
- `headerHeight` = measured from the actual `<thead>` element
- `rowHeight` = a **fixed constant** passed as an input (default: 53px)

### Why a Fixed Constant?

Using a fixed `rowHeight` instead of measuring actual DOM rows is critical. If we measured actual rows:

1. Table renders N rows → measures row height → calculates N fits
2. ResizeObserver fires because content changed → recalculates → gets N+1
3. Fetches N+1 rows → renders → ResizeObserver fires → gets N → infinite loop

By using a constant, the calculation is **deterministic** and **content-independent**. The result only changes when the container genuinely resizes.

### Template Structure

```html
<div class="table-container">
  <div class="table-body">
    <!-- flex: 1, overflow: hidden -->
    <!-- spinner OR table goes here -->
  </div>
  <div class="table-footer">
    <!-- flex-shrink: 0, always in DOM -->
    <!-- pagination controls -->
  </div>
</div>
```

Key layout decisions:

- `.table-body` has `flex: 1` + `overflow: hidden` — its height is set by flexbox (container minus footer) and **never changes when rows are added/removed**
- `.table-footer` is **always in the DOM** (uses `visibility: hidden` when no data) so the layout is stable from the first frame
- The loading spinner is **inside** `.table-body`, not a sibling — so `.table-body` always exists for measurement

### Resize Detection

A `ResizeObserver` on `.table-body` handles all resize scenarios:

- Window resize
- Dragging between monitors (different DPI/scaling)
- Sidebar toggle

Since `.table-body` has `overflow: hidden`, its size only changes on genuine layout changes — never from content changes. This makes ResizeObserver safe from feedback loops.

### Usage

```html
<app-table
  [data]="paginatedUsers()"
  [columns]="columns"
  [isLoading]="userResource.isLoading()"
  [pageIndex]="pageIndex()"
  [pageSize]="pageSize()"
  [total]="totalUsers()"
  [autoSize]="true"
  [rowHeight]="61"
  (pageChange)="handlePageChange($event)"
  (pageSizeChange)="onPageSizeChange($event)"
></app-table>
```

The `rowHeight` should match the actual CSS row height for the specific table. For tables with avatars (40px circle + 20px padding + 1px border = 61px), pass `[rowHeight]="61"`. For plain text tables, the default `53` works.

---

## Data Flow Summary

### Page-Flip (Manage Users)

```
┌─────────────┐     pageSizeChange      ┌──────────────────┐
│  app-table   │ ─────────────────────→  │  ManageUsersPage │
│  (autoSize)  │                         │                  │
│              │ ← [pageSize],[data],    │  pageSize signal │
│              │   [total],[isLoading]   │  pageIndex signal│
└─────────────┘                         │  debouncedSearch │
                                        │  ...filters      │
                                        └────────┬─────────┘
                                                 │ resource params change
                                                 ▼
                                        ┌──────────────────┐
                                        │  UserService     │
                                        │  .getAllUsers()   │
                                        └────────┬─────────┘
                                                 │ GET /api/users?page=&pageSize=&...
                                                 ▼
                                        ┌──────────────────┐
                                        │  Backend API     │
                                        │  UserEndpoints   │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  UserService     │
                                        │  .GetAllPaged()  │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  UserRepository  │
                                        │  COUNT + OFFSET  │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  PagedResult<T>  │
                                        │  { items,        │
                                        │    totalCount,   │
                                        │    page,         │
                                        │    pageSize }    │
                                        └──────────────────┘
```

### Load-More (See Bookings)

```
User clicks "Ladda fler"
  → currentPage increments
  → loadBookings(false) called
  → GET /api/bookings/my-owned?page=N&pageSize=20&timeFilter=...
  → response.items appended to bookings signal
  → template renders accumulated list
```

---

## Scope

| Entity           | Paginated?      | Why                                |
| ---------------- | --------------- | ---------------------------------- |
| Users            | Yes (server)    | Can grow to thousands              |
| Bookings (admin) | Yes (server)    | Grows indefinitely                 |
| Bookings (my)    | Yes (load-more) | User's own bookings grow over time |
| Rooms            | No (client)     | Typically < 50                     |
| Campuses         | No (client)     | Typically < 10                     |
| Classes          | No (client)     | Typically < 50                     |
| Roles/Templates  | No (client)     | Typically < 10                     |
