import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CampusResponseDto, CreateBookingDto, RoomDetailModel } from '../../models/models';

/**
 * Service for the public booking form.
 * Calls unauthenticated /api/public/* endpoints.
 */
@Injectable({
  providedIn: 'root',
})
export class PublicBookingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/public';

  /** Get all rooms (public, no auth required) */
  getRooms(): Observable<RoomDetailModel[]> {
    return this.http.get<RoomDetailModel[]>(`${this.baseUrl}/rooms`);
  }

  /** Get all campuses (public, no auth required) */
  getCampuses(): Observable<CampusResponseDto[]> {
    return this.http.get<CampusResponseDto[]>(`${this.baseUrl}/campuses`);
  }

  /** Check if the booking form is currently enabled */
  getFormStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(`${this.baseUrl}/bookings/status`);
  }

  /** Submit a public booking request (creates a Pending booking) */
  createBooking(
    dto: CreateBookingDto,
  ): Observable<{ id: number; message: string; status: string }> {
    return this.http.post<{ id: number; message: string; status: string }>(
      `${this.baseUrl}/bookings`,
      dto,
    );
  }
}
