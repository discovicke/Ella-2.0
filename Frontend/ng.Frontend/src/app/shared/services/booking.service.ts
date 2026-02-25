import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateBookingDto, BookingDetailedReadModel, BookingStatus } from '../../models/models';

export interface BookingFilterParams {
  userId?: number;
  roomId?: number;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/bookings';

  getBookingsByUserId(userId: number): Observable<BookingDetailedReadModel[]> {
    // Note: userId param is ignored as the backend uses the token to identify the user
    return this.http.get<BookingDetailedReadModel[]>(`${this.apiUrl}/my-owned`);
  }

  getAllBookings(filters?: BookingFilterParams): Observable<BookingDetailedReadModel[]> {
    let params = new HttpParams();
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.roomId) params = params.set('roomId', filters.roomId);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<BookingDetailedReadModel[]>(this.apiUrl, { params });
  }

  updateBookingStatus(bookingId: number, status: BookingStatus): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${bookingId}?newStatus=${status}`, {});
  }

  cancelBooking(bookingId: number): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${bookingId}?newStatus=Cancelled`, {});
  }

  createBooking(booking: CreateBookingDto): Observable<unknown> {
    return this.http.post(this.apiUrl, booking);
  }
}
