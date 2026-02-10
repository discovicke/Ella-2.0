import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { AuthResponseDto, LoginDto, UserRole } from '../../api/models';
import { SessionService, UserState } from './session.service';

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
    // 1. Perform Login and capture user data
    // The backend returns { message, token, user }
    const response = await lastValueFrom(
      this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, credentials)
    );
    
    const userState = this.mapToUserState(response.user);

    // 2. Update session
    this.sessionService.setUser(userState);
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

  private mapToUserState(apiUser: any): UserState {
    return {
      id: apiUser.id,
      email: apiUser.email,
      displayName: apiUser.displayName,
      role: apiUser.role as UserRole,
    };
  }
}