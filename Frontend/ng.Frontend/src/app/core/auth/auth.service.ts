import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthResponseDto, LoginDto, UserPermissions } from '../../models/models';
import { SessionService, UserState } from '../session.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionService = inject(SessionService);
  private readonly apiUrl = '/api/auth';

  /**
   * Login user and update session state
   */
  async login(credentials: LoginDto): Promise<void> {
    try {
      // 1. Perform Login and capture user data
      // The backend returns { message, token, user }
      const response = await lastValueFrom(
        this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, credentials),
      );

      const userState = this.mapToUserState(response.user);
      userState.token = response.token; // Spara JWT token

      // 2. Update session
      this.sessionService.setUser(userState);
    } catch (error: any) {
      // If the user is banned, the backend returns 403 with user info in the body
      if (error.status === 403 && error.error?.code === 'USER_BANNED' && error.error?.user) {
        // TODO: Fixa toasten om man loggar in som bannad användare, det är fel text i den toasten för tillfället
        const userState = this.mapToUserState(error.error.user);
        this.sessionService.setUser(userState);
      }
      throw error;
    }
  }

  /**
   * Logout user, clear session, and navigate to login
   */
  async logout(): Promise<void> {
    try {
      await lastValueFrom(this.http.post(`${this.apiUrl}/logout`, {}));
    } catch (e) {
      console.warn('Logout API call failed', e);
    }

    // Clear session
    this.sessionService.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * Refreshes the current session user from /auth/me so permission changes
   * (e.g. after role updates) are reflected immediately in the UI.
   */
  async refreshCurrentUser(): Promise<void> {
    const current = this.sessionService.currentUser();
    if (!current) return;

    try {
      const response = await lastValueFrom(
        this.http.get<{ user: any }>(`${this.apiUrl}/me`, { withCredentials: true }),
      );

      const userState = this.mapToUserState(response.user);
      userState.token = current.token;
      this.sessionService.setUser(userState);
    } catch (error) {
      console.warn('Failed to refresh current user from /auth/me', error);
    }
  }

  public mapToUserState(apiUser: any): UserState {
    return {
      id: apiUser.id,
      email: apiUser.email,
      displayName: apiUser.displayName,
      permissions: apiUser.permissions ?? null,
      isBanned: !!apiUser.isBanned,
    };
  }
}
