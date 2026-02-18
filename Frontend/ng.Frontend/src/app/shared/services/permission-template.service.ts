import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PermissionTemplateDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class PermissionTemplateService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/permission-templates';

  getAll(): Observable<PermissionTemplateDto[]> {
    return this.http.get<PermissionTemplateDto[]>(this.apiUrl);
  }

  updateAll(
    templates: PermissionTemplateDto[],
    propagate = false,
  ): Observable<PermissionTemplateDto[]> {
    const url = propagate ? `${this.apiUrl}?propagate=true` : this.apiUrl;
    return this.http.put<PermissionTemplateDto[]>(url, templates);
  }
}
