import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
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

  private roomsCache$?: Observable<RoomDetailModel[]>;
  private roomTypesCache$?: Observable<RoomTypeResponseDto[]>;
  private assetTypesCache$?: Observable<AssetTypeResponseDto[]>;

  getAllRooms(): Observable<RoomDetailModel[]> {
    if (!this.roomsCache$) {
      this.roomsCache$ = this.http.get<RoomDetailModel[]>(this.apiUrl).pipe(shareReplay(1));
    }
    return this.roomsCache$;
  }

  createRoom(dto: CreateRoomDto): Observable<RoomResponseDto> {
    return this.http.post<RoomResponseDto>(this.apiUrl, dto).pipe(
      tap(() => this.roomsCache$ = undefined)
    );
  }

  updateRoom(id: number, dto: UpdateRoomDto): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto).pipe(
      tap(() => this.roomsCache$ = undefined)
    );
  }

  deleteRoom(id: number, force = false): Observable<void> {
    const url = force ? `${this.apiUrl}/${id}?force=true` : `${this.apiUrl}/${id}`;
    return this.http.delete<void>(url).pipe(
      tap(() => this.roomsCache$ = undefined)
    );
  }

  getRoomTypes(): Observable<RoomTypeResponseDto[]> {
    if (!this.roomTypesCache$) {
      this.roomTypesCache$ = this.http.get<RoomTypeResponseDto[]>(`${this.apiUrl}/types`).pipe(shareReplay(1));
    }
    return this.roomTypesCache$;
  }

  getAssetTypes(): Observable<AssetTypeResponseDto[]> {
    if (!this.assetTypesCache$) {
      this.assetTypesCache$ = this.http.get<AssetTypeResponseDto[]>(this.assetsApiUrl).pipe(shareReplay(1));
    }
    return this.assetTypesCache$;
  }

  createAssetType(dto: CreateAssetTypeDto): Observable<AssetTypeResponseDto> {
    return this.http.post<AssetTypeResponseDto>(this.assetsApiUrl, dto).pipe(
      tap(() => this.assetTypesCache$ = undefined)
    );
  }

  updateAssetType(id: number, dto: UpdateAssetTypeDto): Observable<void> {
    return this.http.put<void>(`${this.assetsApiUrl}/${id}`, dto).pipe(
      tap(() => this.assetTypesCache$ = undefined)
    );
  }

  deleteAssetType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.assetsApiUrl}/${id}`).pipe(
      tap(() => this.assetTypesCache$ = undefined)
    );
  }
}
