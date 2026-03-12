import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { CampusResponseDto, CreateCampusDto, UpdateCampusDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class CampusService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/campuses';
  
  private cache$?: Observable<CampusResponseDto[]>;

  getAll(): Observable<CampusResponseDto[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<CampusResponseDto[]>(this.apiUrl).pipe(shareReplay(1));
    }
    return this.cache$;
  }

  getById(id: number): Observable<CampusResponseDto> {
    return this.http.get<CampusResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateCampusDto): Observable<CampusResponseDto> {
    return this.http.post<CampusResponseDto>(this.apiUrl, dto).pipe(
      tap(() => this.clearCache())
    );
  }

  update(id: number, dto: UpdateCampusDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => this.clearCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }

  private clearCache(): void {
    this.cache$ = undefined;
  }
}
