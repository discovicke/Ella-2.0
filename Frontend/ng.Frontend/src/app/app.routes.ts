import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { UserRole } from './models/models';

export const routes: Routes = [
  // =========================================================
  // 1. PUBLIC AREA (No Login Required)
  // =========================================================

  // {
  //   path: '',
  //   loadComponent: () => import('./pages/_public/home/home.page').then((m) => m.HomePage),
  // },
  // COMMENTED OUT HOME PAGE FOR NOW and REDIRECTING ROOT TO LOGIN INSTEAD, MAY RE-ADD LATER

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
  {
    path: 'bookingform',
    loadComponent: () =>
      import('./pages/_public/bookingform/bookingform.component').then(
        (m) => m.BookingformComponent,
      ),
  },

  // =========================================================
  // 2. ADMINISTRATOR AREA
  // =========================================================
  {
    path: 'administrator',
    canActivate: [authGuard],
    data: { roles: [UserRole.Admin] },
    // 1. Load the "Shell" (Sidebar + RouterOutlet)
    loadComponent: () =>
      import('./pages/administrator/administrator.layout').then((m) => m.AdministratorLayout),

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
    canActivate: [authGuard],
    data: { roles: [UserRole.Student] },
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
    canActivate: [authGuard],
    data: { roles: [UserRole.Educator] },
    loadComponent: () => import('./pages/educator/educator.layout').then((m) => m.EducatorLayout),
    children: [
      // Add educator pages here later
    ],
  },

  // =========================================================
  // 5. FALLBACK (404)
  // =========================================================

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full', // Redirect / -> /login
  },
  {
    path: '**',
    redirectTo: 'not-found', // Send unknown URLs to Not Found page
  },
];
