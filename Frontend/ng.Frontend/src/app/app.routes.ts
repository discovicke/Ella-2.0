import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // =========================================================
  // 1. PUBLIC AREA (No Login Required)
  // =========================================================

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
        loadComponent: () =>
          import('./pages/main/system-overview/system-overview.page').then(
            (m) => m.SystemOverviewPage,
          ),
      },
      {
        path: 'manage-users',
        loadComponent: () =>
          import('./pages/main/manage-users/manage-users.page').then((m) => m.ManageUsersPage),
      },
      {
        path: 'manage-rooms',
        loadComponent: () =>
          import('./pages/main/manage-rooms/manage-rooms.page').then((m) => m.ManageRoomsPage),
      },
      {
        path: 'manage-bookings',
        loadComponent: () =>
          import('./pages/main/manage-bookings/manage-bookings.page').then(
            (m) => m.ManageBookingsPage,
          ),
      },
      {
        path: 'manage-roles',
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
        loadComponent: () =>
          import('./pages/main/book-room/book-room.page').then((m) => m.BookRoomPage),
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
