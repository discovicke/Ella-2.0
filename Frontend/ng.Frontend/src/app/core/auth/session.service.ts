import { computed, Injectable, signal } from '@angular/core';
import { UserRole } from '../../api/models';

export interface UserState {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
}

const STORAGE_KEY = 'auth_user';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  // Internal state signal
  private readonly _currentUser = signal<UserState | null>(null);

  // Public Selectors
  readonly currentUser = computed(() => this._currentUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role);

  constructor() {
    this.restoreSession();
  }

  /**
   * Restores the user session from LocalStorage.
   */
  restoreSession(): void {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY);
      if (storedUser) {
        this._currentUser.set(JSON.parse(storedUser));
      }
    } catch (error) {
      console.warn('Failed to parse stored user data', error);
      this.clearSession();
    }
  }

  /**
   * Updates the current user session.
   */
  setUser(user: UserState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  /**
   * Clears the current user session.
   */
  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this._currentUser.set(null);
  }

  /**
   * Check if current user has one of the required roles
   */
  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.userRole();
    return !!role && allowedRoles.includes(role);
  }
}
