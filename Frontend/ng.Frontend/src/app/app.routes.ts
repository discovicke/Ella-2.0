import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  // =========================================================
  // 1. PUBLIC AREA (No Login Required)
  // =========================================================

  {
    path: 'login',
    loadComponent: () => import('./pages/_public/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/_public/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/_public/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
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
    path: 'banned',
    loadComponent: () => import('./pages/_public/banned/banned.page').then((m) => m.BannedPage),
  },
  {
    path: 'bookingform',
    loadComponent: () =>
      import('./pages/_public/bookingform/bookingform.component').then(
        (m) => m.BookingformComponent,
      ),
  },

  // =========================================================
  // 2. MAIN APPLICATION AREA (Authenticated)
  // =========================================================
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/main/main.layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'system-overview',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/main/system-overview/system-overview.page').then(
            (m) => m.SystemOverviewPage,
          ),
      },
      {
        path: 'manage-users',
        canActivate: [permissionGuard],
        data: { permission: 'manageUsers' },
        loadComponent: () =>
          import('./pages/main/manage-users/manage-users.page').then((m) => m.ManageUsersPage),
      },
      {
        path: 'manage-slugs',
        canActivate: [permissionGuard],
        data: { permission: 'manageUsers' },
        loadComponent: () =>
          import('./pages/main/manage-slugs/manage-slugs.page').then((m) => m.ManageSlugsPage),
      },
      {
        path: 'manage-resources',
        canActivate: [permissionGuard],
        data: { permission: 'manageResources' },
        loadComponent: () =>
          import('./pages/main/manage-resources/manage-resources.page').then(
            (m) => m.ManageResourcesPage,
          ),
      },
      {
        path: 'manage-rooms',
        canActivate: [permissionGuard],
        data: { permission: 'manageRooms' },
        loadComponent: () =>
          import('./pages/main/manage-rooms/manage-rooms.page').then((m) => m.ManageRoomsPage),
      },
      {
        path: 'manage-campuses',
        canActivate: [permissionGuard],
        data: { permission: 'manageCampuses' },
        loadComponent: () =>
          import('./pages/main/manage-campuses/manage-campuses.page').then(
            (m) => m.ManageCampusesPage,
          ),
      },
      {
        path: 'manage-classes',
        canActivate: [permissionGuard],
        data: { permission: 'manageClasses' },
        loadComponent: () =>
          import('./pages/main/manage-classes/manage-classes.page').then(
            (m) => m.ManageClassesPage,
          ),
      },
      {
        path: 'manage-bookings',
        canActivate: [permissionGuard],
        data: { permission: 'manageBookings' },
        loadComponent: () =>
          import('./pages/main/manage-bookings/manage-bookings.page').then(
            (m) => m.ManageBookingsPage,
          ),
      },
      {
        path: 'manage-roles',
        canActivate: [permissionGuard],
        data: { permission: 'manageRoles' },
        loadComponent: () =>
          import('./pages/main/manage-roles/manage-roles.page').then((m) => m.ManageRolesPage),
      },
      {
        path: 'see-bookings',
        loadComponent: () =>
          import('./pages/main/see-bookings/see-bookings.page').then((m) => m.SeeBookingsPage),
      },
      {
        path: 'book-room',
        canActivate: [permissionGuard],
        data: { permission: 'bookRoom' },
        loadComponent: () =>
          import('./pages/main/book-room/book-room.page').then((m) => m.BookRoomPage),
      },
      {
        path: 'book-resource',
        canActivate: [permissionGuard],
        data: { permission: 'manageResources'},
        loadComponent: () =>
          import('./pages/main/book-resource/book-resource.page').then((m) => m.BookResourcePage),
      },
      // Redirect root of authenticated area to see-bookings
      {
        path: '',
        redirectTo: 'see-bookings',
        pathMatch: 'full',
      },
    ],
  },

  // =========================================================
  // 3. FALLBACK (404)
  // =========================================================

  {
    path: '**',
    redirectTo: 'not-found',
  },
];
