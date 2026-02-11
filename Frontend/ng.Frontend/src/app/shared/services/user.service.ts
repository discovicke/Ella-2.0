import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap,Observable } from 'rxjs';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../../models/models';

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

  createUser(user: CreateUserDto): Observable<unknown> {
    return this.http.post(this.apiUrl, user, { withCredentials: true }).pipe(
      tap(() => this.refresh()) // Refresh the user list after creating a new user
    );
  }

  updateUser(userId: number, userData: UpdateUserDto): Observable<unknown> {
    // Vi skickar med withCredentials: true för att behålla inloggningen
    return this.http.put(`${this.apiUrl}/${userId}`, userData, { withCredentials: true }).pipe(
      tap(() => this.refresh()) // Detta gör att admin-listan hoppar till liv med ny data!
    );
  }

  deleteUser(userId: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${userId}`, { withCredentials: true }).pipe(
      tap(() => this.refresh())
    );
  }
}
