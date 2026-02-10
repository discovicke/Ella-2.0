import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { LoginDto, UserRole } from '../../api/models';

interface AuthState {
  accessToken: string | null;
  currentUser: DecodedToken | null;
}

interface DecodedToken {
  sub: string; // email or id
  role: UserRole;
  // Add other claims here if needed based on your JWT structure
  // standard claims: exp, iat, etc.
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = '/api/auth';

  // State Signals
  private readonly state = signal<AuthState>({
    accessToken: null, // access token is now only in memory/cookie, but we keep this field for compatibility/decoding
    currentUser: null,
  });

  // Public Selectors
  readonly accessToken = computed(() => this.state().accessToken);
  readonly currentUser = computed(() => this.state().currentUser);
  // Authenticated if we have a user profile
  readonly isAuthenticated = computed(() => !!this.state().currentUser);
  readonly userRole = computed(() => this.state().currentUser?.role);

  constructor() {}

  /**
   * Initializes authentication state by checking for an existing session.
   * Used by APP_INITIALIZER to block app startup until auth check is done.
   */
  initialize(): Observable<boolean> {
    return this.fetchCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        // Silent failure is expected if not logged in
        console.debug('Not authenticated on startup');
        return of(true); // Return true so the app can still start (just unauthenticated)
      })
    );
  }

  /**
   * Login user and update state
   */
  login(credentials: LoginDto): Observable<unknown> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, credentials).pipe(
      tap((response) => {
        // We still get the token in the body, which is useful for extracting immediate claims
        // without waiting for a second network roundtrip, but we rely on the cookie for transport.
        const decoded = this.decodeToken(response.token);
        this.state.set({
          accessToken: response.token, // Keep in memory for decoding/debug, but not used for transport
          currentUser: decoded,
        });
      }),
      // If token doesn't have role (fallback), fetch full user profile
      tap(() => {
        if (!this.userRole()) {
          this.fetchCurrentUser().subscribe();
        }
      })
    );
  }

  /**
   * Fetch current user details from API and update state
   */
  fetchCurrentUser(): Observable<any> {
    return this.http.get<{ user: any }>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        console.log('AuthService: fetched response', response);
        const user = response.user; // Unwrap the user object
        this.state.update((s) => {
          const newState = {
            ...s,
            currentUser: {
              ...(s.currentUser || { sub: '', role: UserRole.Student }), // Safe fallback
              role: user.role,
              sub: user.email || s.currentUser?.sub || ''
            }
          };
          console.log('AuthService: updated state', newState);
          return newState;
        });
      })
    );
  }

  /**
   * Logout user, clear storage, and navigate to login
   */
  logout(): void {
    // Fire and forget logout call to backend
    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      error: (err) => console.warn('Logout API call failed', err)
    });

    this.state.set({
      accessToken: null,
      currentUser: null,
    });
    this.router.navigate(['/login']);
  }

  /**
   * Check if current user has one of the required roles
   */
  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.userRole();
    console.log('AuthService: checking role', { current: role, allowed: allowedRoles });
    return !!role && allowedRoles.includes(role);
  }

  /**
   * Simple JWT decoder (Base64)
   * Avoids external dependencies like jwt-decode
   */
  private decodeToken(token: string): DecodedToken | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decodedJson = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const decoded: any = JSON.parse(decodedJson);

      // Map claims to our interface.
      // Adjust these property names based on what your backend actually sends!
      // Common ASP.NET Identity claims might use long URLs as keys.
      return {
        sub: decoded.sub || decoded.nameid || decoded.Nameid || decoded.email || decoded.Email,
        role: decoded.role || decoded.Role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
        exp: decoded.exp || decoded.Exp
      };
    } catch (e) {
      console.error('Failed to decode token', e);
      return null;
    }
  }

}
