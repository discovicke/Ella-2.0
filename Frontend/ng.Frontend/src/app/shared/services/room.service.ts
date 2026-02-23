import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import { RoomDetailModel, RoomTypeResponseDto } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/rooms';

  getAllRooms(): Observable<RoomDetailModel[]> {
    return this.http.get<RoomDetailModel[]>(this.apiUrl);
  }

  getRoomTypes(): Observable<RoomTypeResponseDto[]> {
    return this.http.get<RoomTypeResponseDto[]>(`${this.apiUrl}/types`);
  }
}
