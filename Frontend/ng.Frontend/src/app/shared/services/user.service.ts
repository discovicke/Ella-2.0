import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import {
  CreateUserDto,
  ImportUsersResponseDto,
  UserPermissions,
  UpdateUserDto,
  UserResponseDto,
  PagedResultOfUserResponseDto,
} from '../../models/models';

export interface UpdatePermissionsRequest {
  templateId: number | null;
  bookRoom: boolean;
  manageUsers: boolean;
  manageClasses: boolean;
  manageRooms: boolean;
  manageBookings: boolean;
  manageCampuses: boolean;
  manageRoles: boolean;
}

export interface UserPagedParams {
  page?: number;
  pageSize?: number;
  search?: string;
  templateId?: number;
  isBanned?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/users';

  public readonly refreshTrigger = signal(0);

  getAllUsers(params?: UserPagedParams): Observable<PagedResultOfUserResponseDto> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.templateId !== undefined)
      httpParams = httpParams.set('templateId', params.templateId);
    if (params?.isBanned) httpParams = httpParams.set('isBanned', params.isBanned);
    return this.http.get<PagedResultOfUserResponseDto>(this.apiUrl, { params: httpParams });
  }

  getUserById(userId: number): Observable<UserResponseDto> {
    return this.http.get<UserResponseDto>(`${this.apiUrl}/${userId}`);
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

  applyTemplate(userId: number, templateId: number): Observable<UserPermissions> {
    return this.http
      .post<UserPermissions>(`${this.apiUrl}/${userId}/apply-template/${templateId}`, null, {
        withCredentials: true,
      })
      .pipe(tap(() => this.refresh()));
  }

  updatePermissions(
    userId: number,
    permissions: UpdatePermissionsRequest,
  ): Observable<UserPermissions> {
    return this.http
      .put<UserPermissions>(`${this.apiUrl}/${userId}/permissions`, permissions, {
        withCredentials: true,
      })
      .pipe(tap(() => this.refresh()));
  }

  deleteUser(userId: number): Observable<unknown> {
    return this.http
      .delete(`${this.apiUrl}/${userId}`, { withCredentials: true })
      .pipe(tap(() => this.refresh()));
  }

  // ── User ↔ Campus ──────────────────────────────────

  getUserCampuses(userId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${userId}/campuses`);
  }

  setUserCampuses(userId: number, campusIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/campuses`, campusIds);
  }

  // ── User ↔ Class ───────────────────────────────────

  getUserClasses(userId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${userId}/classes`);
  }

  setUserClasses(userId: number, classIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${userId}/classes`, classIds);
  }

  // ── Import ─────────────────────────────────────────

  importUsersFromCsv(
    file: File,
    className: string,
    templateId?: number,
  ): Observable<ImportUsersResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('className', className);
    if (templateId != null) {
      formData.append('templateId', templateId.toString());
    }
    return this.http.post<ImportUsersResponseDto>('/api/import', formData, {
      withCredentials: true,
    });
  }
}
