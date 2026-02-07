
# Project Architecture & Developer Guide

## Best Practices Cheat Sheet

| Requirement | Rule |
| --- | --- |
| **New Route?** | Use `npm run g-page`. |
| **New Widget?** | Use `ng g c shared/components/my-widget`. |
| **Data Access?** | Always use a Service (`ng g s shared/services/user`). |
| **Performance?** | Never remove `changeDetection: ChangeDetectionStrategy.OnPush`. |

## 1. High-Level Philosophy

This project follows a **Standalone Component** architecture with a strict separation between **Layouts** (Shells) and **Pages** (Views). We enforce this structure using custom generation scripts to ensure consistency across the team.

### Core Rules

* **Strict Typing:** We rely heavily on TypeScript interfaces.
* **OnPush Strategy:** All components use `ChangeDetectionStrategy.OnPush` by default for performance.
* **No "ng g c" when creating layouts/pages:** We do not use the standard Angular CLI component generator for pages/layouts because it doesn't follow our specific naming conventions (`.page.ts`, `.layout.ts`).

---

## 2. Directory Structure (`src/app/`)

We organize code by **Domain/Feature**, not technical type.

```text
src/app/
├── pages/                  # 📍 ROUTABLE DESTINATIONS
│   ├── _public/            # Publicly accessible pages (Login, Register)
│   ├── administrator/      # Admin-only section
│   ├── student/            # Student-only section
│   └── educator/           # Educator-only section
│
├── shared/                 # ♻️ REUSABLE CODE
│   ├── components/         # Dumb widgets (Buttons, Cards, Modals)
│   ├── services/           # Data fetching & State
│   ├── guards/             # Route protection
│   └── pipes/              # Data formatting
│
└── app.routes.ts           # 🚦 The Central Traffic Controller

```

---

## 3. The "Layout vs. Page" Pattern

We distinguish clearly between a "Container" and its "Content".

### 🏛️ Layouts (`*.layout.ts`)

* **Role:** The "Frame" or "Shell" of the application.
* **Contains:** Persistent elements like Sidebars, Topbars, and the `<router-outlet>`.
* **Lifespan:** Stays alive while the user navigates between child pages.
* **Naming:** `admin.layout.ts`

### 📄 Pages (`*.page.ts`)

* **Role:** The "Content" that fills the screen.
* **Contains:** Specific views like Dashboards, Forms, or Lists.
* **Lifespan:** Destroyed and recreated when the URL changes.
* **Naming:** `dashboard.page.ts`

---

## 4. 🛠️ Custom Generators (How to Create Files)

**Do not use `ng g c` for pages or layouts.**
We have custom scripts in `scripts/` that enforce our architecture (OnPush, Naming, Folder Structure).

### ✅ How to Generate a Page

Creates a routable page component (TS, HTML, SCSS, Spec).

**Command:**

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

**Command:**

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
  // 1. Define the Layout (The Shell)
  {
    path: 'admin',
    loadComponent: () => import('./pages/administrator/administrator.layout').then(m => m.AdministratorLayout),
    canActivate: [authGuard, roleGuard], // 🔒 Protect the shell
    
    // 2. Define the Children (The Pages)
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/administrator/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/administrator/users/users.page').then(m => m.UsersPage)
      }
    ]
  }
];

```

---

## 6. Current Route Map

As of the latest architecture update, the application is divided into four distinct zones.

### 🌍 Public Zone (No Login)

| URL | Page Component | Description |
| --- | --- | --- |
| `/` | `HomePage` | Landing page. |
| `/login` | `LoginPage` | User authentication. |
| `/register` | `RegisterPage` | New user signup. |
| `/not-found` | `NotFoundPage` | Generic 404 error. |
| `/forbidden` | `ForbiddenPage` | 403 Access Denied. |

### 🔐 Protected Zones (Requires Login)

These zones use **Layouts** to provide a persistent sidebar/header.

**1. Administrator** (`/admin`)

* **Layout:** `AdministratorLayout`
* **Default Redirect:** `/admin/overview`
* **Sub-Pages:**
* `/overview`: Dashboard stats (`OverviewPage`)
* `/users`: User management (`ManageUsersPage`)
* `/rooms`: Room inventory (`ManageRoomsPage`)
* `/bookings`: Booking oversight (`ManageBookingsPage`)



**2. Student** (`/student`)

* **Layout:** `StudentLayout`
* **Status:** *Under Construction* (Currently redirects to Not Found)

**3. Educator** (`/educator`)

* **Layout:** `EducatorLayout`
* **Status:** *Under Construction* (Currently redirects to Not Found)

### ⚠️ Fallback Strategy

* Any unknown URL (`**`) redirects immediately to `/not-found`.

---

## 7. CSS & Assets

* **Global Styles:** `src/styles.scss` (Use sparingly).
* **Assets:** Place images/fonts in `src/assets/`.
* Usage in HTML: `<img src="assets/logo.png">` (No `src/` prefix in the tag).
* **Component Styles:** Use the `*.scss` file next to your component.

---