/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export enum BookingStatus {
  Active = "Active",
  Cancelled = "Cancelled",
  Expired = "Expired",
}

export enum BannedStatus {
  NotBanned = "NotBanned",
  Banned = "Banned",
}

export interface AssetTypeResponseDto {
  /** @format int64 */
  id: number;
  description: string;
}

export interface AuthedUserResponseDto {
  /** @format int64 */
  id?: number;
  email: string;
  displayName?: string | null;
  permissions?: UserPermissions;
  isBanned?: boolean;
}

export interface AuthResponseDto {
  message: string;
  token: string;
  user: AuthedUserResponseDto;
}

export interface BookingDetailedReadModel {
  /** @format int64 */
  bookingId?: number;
  /** @format int64 */
  userId?: number;
  userName?: string | null;
  userEmail?: string | null;
  /** @format int64 */
  roomId?: number;
  roomName?: string | null;
  /** @format int32 */
  roomCapacity?: number | null;
  roomType?: string | null;
  roomFloor?: string | null;
  /** @format date-time */
  startTime?: string;
  /** @format date-time */
  endTime?: string;
  status?: BookingStatus;
  notes?: string | null;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string | null;
  /** @format int32 */
  registrationCount?: number;
}

export interface CreateAssetTypeDto {
  description: string;
}

export interface CreateBookingDto {
  /** @format int64 */
  userId: number;
  /** @format int64 */
  roomId: number;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  notes: string | null;
  status: BookingStatus;
}

export interface CreateRoomDto {
  /** @format int64 */
  campusId: number;
  name: string;
  /** @format int32 */
  capacity: number | null;
  /** @format int64 */
  roomTypeId: number;
  floor: string | null;
  notes: string | null;
  assetIds: number[] | null;
}

export interface CreateUserDto {
  email: string;
  displayName: string | null;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface PermissionTemplateDto {
  /** @format int64 */
  id?: number | null;
  name?: string;
  label?: string;
  cssClass?: string;
  permissions?: Record<string, boolean>;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string | null;
}

export interface RoomDetailModel {
  /** @format int64 */
  roomId?: number;
  /** @format int64 */
  campusId?: number;
  name?: string;
  campusCity?: string;
  /** @format int32 */
  capacity?: number | null;
  /** @format int64 */
  roomTypeId?: number;
  roomTypeName?: string;
  floor?: string | null;
  notes?: string | null;
  assets?: string[] | null;
}

export interface RoomResponseDto {
  /** @format int64 */
  id: number;
  /** @format int64 */
  campusId: number;
  name: string;
  campusCity: string;
  /** @format int32 */
  capacity: number | null;
  /** @format int64 */
  roomTypeId: number;
  roomTypeName: string;
  floor: string | null;
  notes: string | null;
  assets: string[] | null;
}

export interface RoomTypeResponseDto {
  /** @format int64 */
  id: number;
  name: string;
}

export interface UpdateAssetTypeDto {
  description: string;
}

export interface UpdatePermissionDto {
  /** @format int64 */
  templateId: number | null;
  bookRoom: boolean;
  myBookings: boolean;
  manageUsers: boolean;
  manageClasses: boolean;
  manageRooms: boolean;
  manageAssets: boolean;
  manageBookings: boolean;
  manageCampuses: boolean;
  manageRoles: boolean;
}

export interface UpdateRoomDto {
  /** @format int64 */
  campusId: number;
  name: string;
  /** @format int32 */
  capacity: number | null;
  /** @format int64 */
  roomTypeId: number;
  floor: string | null;
  notes: string | null;
  assetIds: number[] | null;
}

export interface UpdateUserDto {
  /** @format int64 */
  id: number;
  email: string;
  displayName: string | null;
  password: string | null;
  isBanned: BannedStatus;
}

export type UserPermissions = {
  /** @format int64 */
  userId?: number;
  /** @format int64 */
  permissionTemplateId?: number | null;
  bookRoom?: boolean;
  myBookings?: boolean;
  manageUsers?: boolean;
  manageClasses?: boolean;
  manageRooms?: boolean;
  manageAssets?: boolean;
  manageBookings?: boolean;
  manageCampuses?: boolean;
  manageRoles?: boolean;
};

export interface UserPermissions2 {
  /** @format int64 */
  userId?: number;
  /** @format int64 */
  permissionTemplateId?: number | null;
  bookRoom?: boolean;
  myBookings?: boolean;
  manageUsers?: boolean;
  manageClasses?: boolean;
  manageRooms?: boolean;
  manageAssets?: boolean;
  manageBookings?: boolean;
  manageCampuses?: boolean;
  manageRoles?: boolean;
}

export interface UserResponseDto {
  /** @format int64 */
  id: number;
  email: string;
  displayName: string | null;
  isBanned: BannedStatus;
  permissions: UserPermissions;
}
