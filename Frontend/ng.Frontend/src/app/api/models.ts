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

export enum UserRole {
  Student = "Student",
  Educator = "Educator",
  Admin = "Admin",
}

export enum RoomType {
  Classroom = "Classroom",
  Laboratory = "Laboratory",
  GroupRoom = "GroupRoom",
  ComputerLab = "ComputerLab",
}

/** @default "Active" */
export enum BookingStatus2 {
  Active = "Active",
  Cancelled = "Cancelled",
  Expired = "Expired",
}

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

export interface BookingDetailedReadModel {
  /** @format int64 */
  bookingId?: number;
  /** @format int64 */
  userId?: number;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: UserRole;
  userClass?: string | null;
  /** @format int64 */
  roomId?: number;
  roomName?: string | null;
  /** @format int32 */
  roomCapacity?: number | null;
  roomType?: RoomType;
  roomFloor?: string | null;
  roomAddress?: string | null;
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
  status?: BookingStatus2;
}

export interface CreateRoomDto {
  name: string;
  /** @format int32 */
  capacity: number | null;
  type: RoomType;
  floor: string | null;
  address: string | null;
  notes: string | null;
  assetIds: number[] | null;
}

export interface CreateUserDto {
  email: string;
  displayName: string | null;
  role: UserRole;
  password: string;
  userClass: string | null;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: string | null;
}

export interface RoomDetailModel {
  /** @format int64 */
  roomId?: number;
  name?: string;
  /** @format int32 */
  capacity?: number | null;
  type?: RoomType;
  floor?: string | null;
  address?: string | null;
  notes?: string | null;
  assets?: string[] | null;
}

export interface RoomResponseDto {
  /** @format int64 */
  id: number;
  name: string;
  /** @format int32 */
  capacity: number | null;
  type: RoomType;
  floor: string | null;
  address: string | null;
  notes: string | null;
  assets: string[] | null;
}

export interface UpdateAssetTypeDto {
  description: string;
}

export interface UpdateRoomDto {
  name: string;
  /** @format int32 */
  capacity: number | null;
  type: RoomType;
  floor: string | null;
  address: string | null;
  notes: string | null;
  assetIds: number[] | null;
}

export interface UpdateUserDto {
  /** @format int64 */
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  password: string;
  userClass: string | null;
  isBanned: BannedStatus;
}

export interface UserResponseDto {
  /** @format int64 */
  id: number;
  email: string;
  displayName: string | null;
  role: UserRole;
  userClass: string | null;
}
