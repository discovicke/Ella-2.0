import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  AssetTypeResponseDto,
  CreateAssetTypeDto,
  CreateRoomDto,
  RoomDetailModel,
  RoomResponseDto,
  RoomTypeResponseDto,
  UpdateAssetTypeDto,
  UpdateRoomDto,
} from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/rooms';
  private readonly assetsApiUrl = '/api/assets';

  getAllRooms(): Observable<RoomDetailModel[]> {
    return this.http.get<RoomDetailModel[]>(this.apiUrl);
  }

  createRoom(dto: CreateRoomDto): Observable<RoomResponseDto> {
    return this.http.post<RoomResponseDto>(this.apiUrl, dto);
  }

  updateRoom(id: number, dto: UpdateRoomDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  deleteRoom(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getRoomTypes(): Observable<RoomTypeResponseDto[]> {
    return this.http.get<RoomTypeResponseDto[]>(`${this.apiUrl}/types`);
  }

  getAssetTypes(): Observable<AssetTypeResponseDto[]> {
    return this.http.get<AssetTypeResponseDto[]>(this.assetsApiUrl);
  }

  createAssetType(dto: CreateAssetTypeDto): Observable<AssetTypeResponseDto> {
    return this.http.post<AssetTypeResponseDto>(this.assetsApiUrl, dto);
  }

  updateAssetType(id: number, dto: UpdateAssetTypeDto): Observable<void> {
    return this.http.put<void>(`${this.assetsApiUrl}/${id}`, dto);
  }

  deleteAssetType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.assetsApiUrl}/${id}`);
  }
}
