import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BookingSlugResponseDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class BookingSlugService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin/booking-slugs';

  getAllSlugs(): Observable<BookingSlugResponseDto[]> {
    return this.http.get<BookingSlugResponseDto[]>(this.baseUrl);
  }

  createSlug(userId: number): Observable<BookingSlugResponseDto> {
    return this.http.post<BookingSlugResponseDto>(this.baseUrl, { userId });
  }

  deleteSlug(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}