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

export type AvailabilityConflictDto = {
  /** @format int64 */
  bookingId: number;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  userName: string | null;
  userEmail: string | null;
  status: BookingStatus;
};

export interface AvailabilityConflictDto2 {
  /** @format int64 */
  bookingId: number;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  userName: string | null;
  userEmail: string | null;
  status: BookingStatus;
}

export interface Booking {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  userId?: number;
  /** @format int64 */
  roomId?: number;
  /** @format date-time */
  startTime?: string;
  /** @format date-time */
  endTime?: string;
  status?: BookingStatus;
  isLesson?: boolean;
  notes?: string | null;
  bookerName?: string | null;
  /** @format uuid */
  recurringGroupId?: string | null;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string | null;
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
  /** @format uuid */
  recurringGroupId?: string | null;
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

export interface BookingSlugQuickInfoDto {
  userDisplayName: string;
  /** @format int64 */
  userId: number;
}

export interface BookingSlugResponseDto {
  /** @format int64 */
  id: number;
  /** @format int64 */
  userId: number;
  userDisplayName: string;
  slug: string;
  isActive: boolean;
  /** @format date-time */
  createdAt: string;
  bookingUrl: string;
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
  /** @default false */
  isLesson?: boolean;
  /** @default null */
  classIds?: number[] | null;
  /** @default null */
  bookerName?: string | null;
  /** @default null */
  recurrencePattern?: string | null;
  /**
   * @format date-time
   * @default null
   */
  recurrenceEnd?: string | null;
}

export interface CreateBookingSlugDto {
  /** @format int64 */
  userId: number;
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
  /** @format int64 */
  roomId: number;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  bookerName: string;
  notes: string | null;
}

export interface CreateResourceBookingDto {
  /** @format int64 */
  resourceId: number;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  notes: string | null;
}

export interface CreateResourceCategoryDto {
  name: string;
}

export interface CreateResourceDto {
  /** @format int64 */
  categoryId: number;
  /** @format int64 */
  campusId: number;
  name: string;
  description: string | null;
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

export interface ForgotPasswordDto {
  email: string;
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

export interface ImportUsersResponseDto {
  /** @format int32 */
  totalRows: number;
  /** @format int32 */
  created: number;
  /** @format int32 */
  updated: number;
  /** @format int32 */
  skipped: number;
  /** @format int64 */
  classId: number;
  className: string;
  errors: string[];
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

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

export interface ResourceBookingResponseDto {
  /** @format int64 */
  id: number;
  /** @format int64 */
  resourceId: number;
  resourceName: string;
  /** @format int64 */
  userId: number;
  userName: string;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  notes: string | null;
}

export interface ResourceCategoryDto {
  /** @format int64 */
  id: number;
  name: string;
}

export interface ResourceResponseDto {
  /** @format int64 */
  id: number;
  /** @format int64 */
  categoryId: number;
  categoryName: string;
  /** @format int64 */
  campusId: number;
  campusCity: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface RoomAvailabilityResultDto {
  /** @format int64 */
  roomId: number;
  roomName: string;
  campusCity: string;
  /** @format int32 */
  capacity: number | null;
  /** @format int64 */
  roomTypeId: number;
  roomTypeName: string;
  floor: string | null;
  notes: string | null;
  assets: string[] | null;
  isAvailable: boolean;
  /** @format int32 */
  matchScore: number;
  matchReasons: string[];
  nextConflict: AvailabilityConflictDto;
  conflicts: AvailabilityConflictDto2[];
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

export interface UpdateBookingDto {
  /**
   * @format date-time
   * @default null
   */
  startTime?: string | null;
  /**
   * @format date-time
   * @default null
   */
  endTime?: string | null;
  /**
   * @maxLength 500
   * @default null
   */
  notes?: string | null;
  /** @default null */
  isLesson?: boolean | null;
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
  manageUsers: boolean;
  manageClasses: boolean;
  manageRooms: boolean;
  manageBookings: boolean;
  manageCampuses: boolean;
  manageRoles: boolean;
  manageResources: boolean;
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
  /** @format int32 */
  permissionLevel: number;
}

export type UserPermissions = {
  /** @format int64 */
  userId?: number;
  /** @format int64 */
  permissionTemplateId?: number | null;
  bookRoom?: boolean;
  manageUsers?: boolean;
  manageClasses?: boolean;
  manageRooms?: boolean;
  manageBookings?: boolean;
  manageCampuses?: boolean;
  manageRoles?: boolean;
  manageResources?: boolean;
};

export interface UserPermissions2 {
  /** @format int64 */
  userId?: number;
  /** @format int64 */
  permissionTemplateId?: number | null;
  bookRoom?: boolean;
  manageUsers?: boolean;
  manageClasses?: boolean;
  manageRooms?: boolean;
  manageBookings?: boolean;
  manageCampuses?: boolean;
  manageRoles?: boolean;
  manageResources?: boolean;
}

export interface UserResponseDto {
  /** @format int64 */
  id: number;
  email: string;
  displayName: string | null;
  isBanned: BannedStatus;
  permissions: UserPermissions;
  /** @format int32 */
  permissionLevel: number;
  /** @default null */
  campusNames?: string[] | null;
  /** @default null */
  classNames?: string[] | null;
}
