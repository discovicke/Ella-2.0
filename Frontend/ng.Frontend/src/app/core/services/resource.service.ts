import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ResourceResponseDto, 
  CreateResourceDto, 
  ResourceCategoryDto, 
  CreateResourceCategoryDto,
  ResourceBookingResponseDto,
  CreateResourceBookingDto
} from '../../../models/models';

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/resources';

  // Categories
  getCategories(): Observable<ResourceCategoryDto[]> {
    return this.http.get<ResourceCategoryDto[]>(`${this.baseUrl}/categories`);
  }

  createCategory(dto: CreateResourceCategoryDto): Observable<ResourceCategoryDto> {
    return this.http.post<ResourceCategoryDto>(`${this.baseUrl}/categories`, dto);
  }

  // Resources
  getResources(): Observable<ResourceResponseDto[]> {
    return this.http.get<ResourceResponseDto[]>(this.baseUrl);
  }

  createResource(dto: CreateResourceDto): Observable<ResourceResponseDto> {
    return this.http.post<ResourceResponseDto>(this.baseUrl, dto);
  }

  deleteResource(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // Bookings
  getBookings(resourceId?: number): Observable<ResourceBookingResponseDto[]> {
    const params = resourceId ? { resourceId: resourceId.toString() } : {};
    return this.http.get<ResourceBookingResponseDto[]>(`${this.baseUrl}/bookings`, { params });
  }

  createBooking(dto: CreateResourceBookingDto): Observable<ResourceBookingResponseDto> {
    return this.http.post<ResourceBookingResponseDto>(`${this.baseUrl}/bookings`, dto);
  }

  deleteBooking(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/bookings/${id}`);
  }
}