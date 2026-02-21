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
  ): Observable<PermissionTemplateDto[]> {
    return this.http.put<PermissionTemplateDto[]>(this.apiUrl, templates);
  }
}
