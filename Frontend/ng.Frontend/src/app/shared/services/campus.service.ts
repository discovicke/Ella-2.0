import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CampusResponseDto,
  CreateCampusDto,
  UpdateCampusDto,
} from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class CampusService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/campuses';

  getAll(): Observable<CampusResponseDto[]> {
    return this.http.get<CampusResponseDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<CampusResponseDto> {
    return this.http.get<CampusResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateCampusDto): Observable<CampusResponseDto> {
    return this.http.post<CampusResponseDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateCampusDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
