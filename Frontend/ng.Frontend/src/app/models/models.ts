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
  Pending = "Pending",
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
  campusCity?: string | null;
  /** @format date-time */
  startTime?: string;
  /** @format date-time */
  endTime?: string;
  status?: BookingStatus;
  notes?: string | null;
  bookerName?: string | null;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string | null;
  /** @format int32 */
  registrationCount?: number;
  /** @format int32 */
  invitationCount?: number;
  roomAssets?: string[] | null;
  userRegistrationStatus?: string | null;
  classNames?: string[] | null;
}

export interface CampusResponseDto {
  /** @format int64 */
  id: number;
  street: string;
  zip: string | null;
  city: string;
  country: string;
  contact: string | null;
}

export interface ClassResponseDto {
  /** @format int64 */
  id: number;
  className: string;
  /** @default null */
  campusNames?: string[] | null;
}

export interface CreateAssetTypeDto {
  /** @maxLength 100 */
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
  /** @maxLength 500 */
  notes: string | null;
  status: BookingStatus;
  /**
   * @maxLength 100
   * @default null
   */
  bookerName?: string | null;
  /** @default null */
  classIds?: number[] | null;
}

export interface CreateCampusDto {
  /** @maxLength 150 */
  street: string;
  /** @maxLength 20 */
  zip: string | null;
  /** @maxLength 100 */
  city: string;
  /** @maxLength 100 */
  country: string;
  /** @maxLength 150 */
  contact: string | null;
}

export interface CreateClassDto {
  /** @maxLength 100 */
  className: string;
}

export interface CreatePublicBookingDto {
  /** @maxLength 100 */
  bookerName: string;
  /** @format int64 */
  roomId: number;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  /** @maxLength 500 */
  notes: string | null;
}

export interface CreateRoomDto {
  /** @format int64 */
  campusId: number;
  /** @maxLength 100 */
  name: string;
  /** @format int32 */
  capacity: number | null;
  /** @format int64 */
  roomTypeId: number;
  /** @maxLength 20 */
  floor: string | null;
  /** @maxLength 200 */
  notes: string | null;
  assetIds: number[] | null;
}

export interface CreateUserDto {
  /** @maxLength 254 */
  email: string;
  /** @maxLength 100 */
  displayName: string | null;
  /** @maxLength 128 */
  password: string;
}

export interface GroupedPagedResultOfBookingDetailedReadModel {
  items: BookingDetailedReadModel[];
  /** @format int32 */
  totalGroups: number;
  /** @format int32 */
  totalItemCount: number;
  /** @format int32 */
  page: number;
  /** @format int32 */
  groupsPerPage: number;
}

export interface InviteClassRequest {
  classIds: number[];
}

export interface InviteRequest {
  userIds: number[];
}

export interface LoginDto {
  /** @maxLength 254 */
  email: string;
  /** @maxLength 128 */
  password: string;
}

export interface PagedResultOfBookingDetailedReadModel {
  items: BookingDetailedReadModel[];
  /** @format int32 */
  totalCount: number;
  /** @format int32 */
  page: number;
  /** @format int32 */
  pageSize: number;
}

export interface PagedResultOfUserResponseDto {
  items: UserResponseDto[];
  /** @format int32 */
  totalCount: number;
  /** @format int32 */
  page: number;
  /** @format int32 */
  pageSize: number;
}

export interface PermissionTemplateDto {
  /** @format int64 */
  id?: number | null;
  /** @maxLength 50 */
  name?: string;
  /** @maxLength 100 */
  label?: string;
  /** @maxLength 50 */
  cssClass?: string;
  permissions?: Record<string, boolean>;
}

export interface RegisterDto {
  /** @maxLength 254 */
  email: string;
  /** @maxLength 128 */
  password: string;
  /** @maxLength 100 */
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
  /** @maxLength 100 */
  description: string;
}

export interface UpdateCampusDto {
  /** @maxLength 150 */
  street: string;
  /** @maxLength 20 */
  zip: string | null;
  /** @maxLength 100 */
  city: string;
  /** @maxLength 100 */
  country: string;
  /** @maxLength 150 */
  contact: string | null;
}

export interface UpdateClassDto {
  /** @maxLength 100 */
  className: string;
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
  /** @maxLength 100 */
  name: string;
  /** @format int32 */
  capacity: number | null;
  /** @format int64 */
  roomTypeId: number;
  /** @maxLength 20 */
  floor: string | null;
  /** @maxLength 200 */
  notes: string | null;
  assetIds: number[] | null;
}

export interface UpdateUserDto {
  /** @format int64 */
  id: number;
  /** @maxLength 254 */
  email: string;
  /** @maxLength 100 */
  displayName: string | null;
  /** @maxLength 128 */
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
  /** @default null */
  campusNames?: string[] | null;
  /** @default null */
  classNames?: string[] | null;
}
