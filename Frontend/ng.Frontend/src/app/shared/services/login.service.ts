import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LoginDto} from '../../api/models';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/auth/login';

  loginUser(loginDto: LoginDto): Observable<unknown> {
    return this.http.post(this.apiUrl, loginDto);
  }
}
