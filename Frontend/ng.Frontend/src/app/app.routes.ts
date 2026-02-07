import { Routes } from '@angular/router';

export const routes: Routes = [
  // =========================================================
  // 1. PUBLIC AREA (No Login Required)
  // =========================================================
  {
    path: '',
    loadComponent: () => import('./pages/_public/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/_public/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/_public/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./pages/_public/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./pages/_public/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },

  // =========================================================
  // 2. ADMINISTRATOR AREA
  // =========================================================
  {
    path: 'administrator',
    // 1. Load the "Shell" (Sidebar + RouterOutlet)
    loadComponent: () =>
      import('./pages/administrator/administrator.layout').then((m) => m.AdministratorLayout),
    // TODO: Add guards here later, e.g., canActivate: [authGuard, adminGuard]

    // 2. Define the "Views" that load inside the shell
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full', // Redirect /admin -> /admin/overview
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/administrator/overview/overview.page').then((m) => m.OverviewPage),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/administrator/manage-users/manage-users.page').then(
            (m) => m.ManageUsersPage,
          ),
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('./pages/administrator/manage-rooms/manage-rooms.page').then(
            (m) => m.ManageRoomsPage,
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/administrator/manage-bookings/manage-bookings.page').then(
            (m) => m.ManageBookingsPage,
          ),
      },
    ],
  },

  // =========================================================
  // 3. STUDENT AREA (Placeholder)
  // =========================================================
  {
    path: 'student',
    loadComponent: () => import('./pages/student/student.layout').then((m) => m.StudentLayout),
    children: [
      // Add student pages here later
    ],
  },

  // =========================================================
  // 4. EDUCATOR AREA (Placeholder)
  // =========================================================
  {
    path: 'educator',
    loadComponent: () => import('./pages/educator/educator.layout').then((m) => m.EducatorLayout),
    children: [
      // Add educator pages here later
    ],
  },

  // =========================================================
  // 5. FALLBACK (404)
  // =========================================================
  {
    path: '**',
    redirectTo: 'not-found', // Send unknown URLs to Not Found page
  },
];
