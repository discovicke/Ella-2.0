import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateBookingDto,
  BookingDetailedReadModel,
  BookingStatus,
  PagedResult,
} from '../../models/models';

export interface BookingFilterParams {
  userId?: number;
  roomId?: number;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

export interface BookingPagedFilterParams extends BookingFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface MyBookingsParams {
  page?: number;
  pageSize?: number;
  timeFilter?: string;
  includeCancelled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/bookings';

  getBookingsByUserId(
    params?: MyBookingsParams,
  ): Observable<PagedResult<BookingDetailedReadModel>> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page);
    if (params?.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params?.timeFilter) httpParams = httpParams.set('timeFilter', params.timeFilter);
    if (params?.includeCancelled !== undefined)
      httpParams = httpParams.set('includeCancelled', params.includeCancelled);
    return this.http.get<PagedResult<BookingDetailedReadModel>>(`${this.apiUrl}/my-owned`, {
      params: httpParams,
    });
  }

  getAllBookings(
    filters?: BookingPagedFilterParams,
  ): Observable<PagedResult<BookingDetailedReadModel>> {
    let params = new HttpParams();
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.pageSize) params = params.set('pageSize', filters.pageSize);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.roomId) params = params.set('roomId', filters.roomId);
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<PagedResult<BookingDetailedReadModel>>(this.apiUrl, { params });
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
