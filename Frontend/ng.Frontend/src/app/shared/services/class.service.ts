import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClassResponseDto, CreateClassDto, UpdateClassDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class ClassService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/classes';

  getAll(): Observable<ClassResponseDto[]> {
    return this.http.get<ClassResponseDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<ClassResponseDto> {
    return this.http.get<ClassResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateClassDto): Observable<ClassResponseDto> {
    return this.http.post<ClassResponseDto>(this.apiUrl, dto);
  }

  update(id: number, dto: UpdateClassDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getClassCampuses(classId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/${classId}/campuses`);
  }

  setClassCampuses(classId: number, campusIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${classId}/campuses`, campusIds);
  }
}
