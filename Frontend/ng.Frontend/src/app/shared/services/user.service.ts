import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { CreateUserDto, Permission, UpdateUserDto, UserResponseDto } from '../../models/models';

export interface UpdatePermissionsRequest {
  templateId: number | null;
  bookRoom: boolean;
  myBookings: boolean;
  manageUsers: boolean;
  manageClasses: boolean;
  manageRooms: boolean;
  manageAssets: boolean;
  manageBookings: boolean;
  manageCampuses: boolean;
  manageRoles: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/users';

  public readonly refreshTrigger = signal(0);

  getAllUsers(): Observable<UserResponseDto[]> {
    return this.http.get<UserResponseDto[]>(this.apiUrl);
  }

  refresh() {
    this.refreshTrigger.update((value) => value + 1);
  }

  createUser(user: CreateUserDto): Observable<UserResponseDto> {
    return this.http
      .post<UserResponseDto>(this.apiUrl, user, { withCredentials: true })
      .pipe(tap(() => this.refresh()));
  }

  updateUser(userId: number, userData: UpdateUserDto): Observable<unknown> {
    return this.http
      .put(`${this.apiUrl}/${userId}`, userData, { withCredentials: true })
      .pipe(tap(() => this.refresh()));
  }

  applyTemplate(userId: number, templateId: number): Observable<Permission> {
    return this.http
      .post<Permission>(`${this.apiUrl}/${userId}/apply-template/${templateId}`, null, {
        withCredentials: true,
      })
      .pipe(tap(() => this.refresh()));
  }

  updatePermissions(userId: number, permissions: UpdatePermissionsRequest): Observable<Permission> {
    return this.http
      .put<Permission>(`${this.apiUrl}/${userId}/permissions`, permissions, {
        withCredentials: true,
      })
      .pipe(tap(() => this.refresh()));
  }

  deleteUser(userId: number): Observable<unknown> {
    return this.http
      .delete(`${this.apiUrl}/${userId}`, { withCredentials: true })
      .pipe(tap(() => this.refresh()));
  }
}
