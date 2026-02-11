import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import { RoomResponseDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/rooms';

  getAllRooms(): Observable<RoomResponseDto[]> {
    return this.http.get<RoomResponseDto[]>(this.apiUrl);
  }

}
