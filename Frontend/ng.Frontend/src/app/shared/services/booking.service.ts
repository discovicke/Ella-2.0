import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateBookingDto, BookingDetailedReadModel } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/bookings';

  getBookings(): Observable<BookingDetailedReadModel[]> {
    return this.http.get<BookingDetailedReadModel[]>(this.apiUrl);
  }

  getBookingsByUserId(userId: number): Observable<BookingDetailedReadModel[]> {
    return this.http.get<BookingDetailedReadModel[]>(`${this.apiUrl}/my-registrations`);
  }

  createBooking(booking: CreateBookingDto): Observable<unknown> {
    return this.http.post(this.apiUrl, booking);
  }
}
