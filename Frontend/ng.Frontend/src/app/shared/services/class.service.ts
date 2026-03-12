import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { ClassResponseDto, CreateClassDto, UpdateClassDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/classes';
  
  private cache$?: Observable<ClassResponseDto[]>;

  getAll(): Observable<ClassResponseDto[]> {
    if (!this.cache$) {
      this.cache$ = this.http.get<ClassResponseDto[]>(this.apiUrl).pipe(shareReplay(1));
    }
    return this.cache$;
  }

  getById(id: number): Observable<ClassResponseDto> {
    return this.http.get<ClassResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateClassDto): Observable<ClassResponseDto> {
    return this.http.post<ClassResponseDto>(this.apiUrl, dto).pipe(
      tap(() => this.clearCache())
    );
  }

  update(id: number, dto: UpdateClassDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => this.clearCache())
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.clearCache())
    );
  }

  getClassCampuses(classId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${classId}/campuses`);
  }

  setClassCampuses(classId: number, campusIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${classId}/campuses`, campusIds);
  }

  private clearCache(): void {
    this.cache$ = undefined;
  }
}
