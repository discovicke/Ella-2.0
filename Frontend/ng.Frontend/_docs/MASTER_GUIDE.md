# Project Architecture & Developer Guide

## Best Practices Cheat Sheet

| Requirement      | Rule                                                            |
| ---------------- | --------------------------------------------------------------- |
| **New Route?**   | Use `npm run g-page`.                                           |
| **New Widget?**  | Use `ng g c shared/components/my-widget`.                       |
| **Data Access?** | Always use a Service (`ng g s shared/services/user`).           |
| **Performance?** | Never remove `changeDetection: ChangeDetectionStrategy.OnPush`. |

## 1. High-Level Philosophy

This project follows a **Standalone Component** architecture with a strict separation between **Layouts** (Shells) and **Pages** (Views). We enforce this structure using custom generation scripts to ensure consistency across the team.

### Core Rules

- **Strict Typing:** We rely heavily on TypeScript interfaces.
- **OnPush Strategy:** All components use `ChangeDetectionStrategy.OnPush` by default for performance.
- **No "ng g c" when creating layouts/pages:** We do not use the standard Angular CLI component generator for pages/layouts because it doesn't follow our specific naming conventions (`.page.ts`, `.layout.ts`).

---

## 2. Directory Structure (`src/app/`)

We organize code by **Domain/Feature**, not technical type.

```text
src/app/
├── pages/                  # 📍 ROUTABLE DESTINATIONS
│   ├── _public/            # Publicly accessible pages (Login, Register, Banned, etc.)
│   └── main/              # Authenticated area (all permission-guarded pages)
│
├── shared/                 # ♻️ REUSABLE CODE
│   ├── components/         # Dumb widgets (Button, Card, Modal, Panel, Table, Toast)
│   ├── services/           # Data fetching & State
│   └── pipes/              # Data formatting
│
├── core/                   # 🔒 AUTH & SESSION
│   ├── auth/               # Guards (auth, permission, admin) & interceptor
│   ├── permission-templates.ts
│   └── session.service.ts
│
├── models/                 # 📦 AUTO-GENERATED
│   └── models.ts           # TypeScript interfaces from OpenAPI spec
│
└── app.routes.ts           # 🚦 The Central Traffic Controller

```

---

## 3. The "Layout vs. Page" Pattern

We distinguish clearly between a "Container" and its "Content".

### 🏛️ Layouts (`*.layout.ts`)

- **Role:** The "Frame" or "Shell" of the application.
- **Contains:** Persistent elements like Sidebars, Topbars, and the `<router-outlet>`.
- **Lifespan:** Stays alive while the user navigates between child pages.
- **Naming:** `admin.layout.ts`

### 📄 Pages (`*.page.ts`)

- **Role:** The "Content" that fills the screen.
- **Contains:** Specific views like Dashboards, Forms, or Lists.
- **Lifespan:** Destroyed and recreated when the URL changes.
- **Naming:** `dashboard.page.ts`

---

## 4. 🛠️ Custom Generators (How to Create Files)

**Do not use `ng g c` for pages or layouts.**
We have custom scripts in `scripts/` that enforce our architecture (OnPush, Naming, Folder Structure).

### ✅ How to Generate a Page

Creates a routable page component (TS, HTML, SCSS, Spec).

**Command (run from `Frontend/ng.Frontend/`):**

```bash
npm run g-page <path/name>

```

**Examples:**

```bash
# 1. From Project Root (defaults to src/app/pages)
npm run g-page administrator/dashboard
# -> Creates src/app/pages/administrator/dashboard/dashboard.page.ts

# 2. From inside a folder (Context Aware)
cd src/app/pages/student
npm run g-page my-grades
# -> Creates src/app/pages/student/my-grades/my-grades.page.ts

```

### ✅ How to Generate a Layout

Creates a layout component with a pre-configured `<router-outlet>`.

**Command (run from `Frontend/ng.Frontend/`):**

```bash
npm run g-layout <path/name>

```

**Examples:**

```bash
npm run g-layout administrator
# -> Creates src/app/pages/administrator/administrator.layout.ts

```

---

## 5. Wiring It Up (Routing)

After generating a Page or Layout, you must manually connect it in `app.routes.ts`. We use **Lazy Loading** for everything.

**`src/app/app.routes.ts`**

```typescript
export const routes: Routes = [
  // 1. Public pages (no auth required)
  {
    path: 'login',
    loadComponent: () => import('./pages/_public/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/_public/register/register.page').then((m) => m.RegisterPage),
  },
  // ...

  // 2. Authenticated area (MainLayout shell)
  {
    path: '',
    loadComponent: () => import('./pages/main/main.layout').then((m) => m.MainLayout),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'see-bookings', pathMatch: 'full' },
      {
        path: 'system-overview',
        loadComponent: () =>
          import('./pages/main/system-overview/system-overview.page').then(
            (m) => m.SystemOverviewPage,
          ),
        canActivate: [adminGuard],
      },
      {
        path: 'manage-users',
        loadComponent: () =>
          import('./pages/main/manage-users/manage-users.page').then((m) => m.ManageUsersPage),
        canActivate: [permissionGuard],
        data: { permission: 'manageUsers' },
      },
      // ... more permission-guarded pages
    ],
  },

  // 3. Fallback
  { path: '**', redirectTo: 'not-found' },
];
```

---

## 6. Current Route Map

As of the latest architecture update, the application is divided into four distinct zones.

### 🌍 Public Zone (No Login)

| URL            | Page Component         | Description                                |
| -------------- | ---------------------- | ------------------------------------------ |
| `/login`       | `LoginPage`            | User authentication.                       |
| `/register`    | `RegisterPage`         | New user signup.                           |
| `/not-found`   | `NotFoundPage`         | Generic 404 error.                         |
| `/forbidden`   | `ForbiddenPage`        | 403 Access Denied.                         |
| `/banned`      | `BannedPage`           | Banned user notice.                        |
| `/bookingform` | `BookingformComponent` | External booking form (no login required). |

### 🔐 Protected Zone (Requires Login)

All protected routes use **`MainLayout`** as the shell. Access to specific sub-pages is controlled by **Permission Guards** (`permissionGuard` / `adminGuard`).

**Main Application** (`/`)

- **Layout:** `MainLayout`
- **Default Redirect:** `/see-bookings`
- **Sub-Pages (Visibility controlled by Permissions):**
  - `/system-overview`: Admin dashboard (Requires `adminGuard`)
  - `/manage-users`: User management (`ManageUsers`)
  - `/manage-rooms`: Room inventory (`ManageRooms`)
  - `/manage-bookings`: Booking oversight (`ManageBookings`)
  - `/manage-roles`: Role configuration (`ManageRoles`)
  - `/see-bookings`: My bookings (`MyBookings`)
  - `/book-room`: New booking (`BookRoom`)

### ⚠️ Fallback Strategy

- Any unknown URL (`**`) redirects immediately to `/not-found`.

---

## 7. CSS & Assets

- **Global Styles:** `src/styles.scss` (Use sparingly).
- **Assets:** Place images/fonts in `src/assets/`.
- Usage in HTML: `<img src="assets/logo.png">` (No `src/` prefix in the tag).
- **Component Styles:** Use the `*.scss` file next to your component.

---
