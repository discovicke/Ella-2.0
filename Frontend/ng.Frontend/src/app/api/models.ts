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
  Teacher = "Teacher",
  Admin = "Admin",
}

export enum RoomType {
  Classroom = "Classroom",
  Laboratory = "Laboratory",
  GroupRoom = "GroupRoom",
  ComputerLab = "ComputerLab",
}

export enum BannedStatus {
  NotBanned = "NotBanned",
  Banned = "Banned",
}

export interface BookingDetailedReadModel {
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  bookingId?: number | string;
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  userId?: number | string;
  userName?: null | string;
  userEmail?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  userRole?: null | number | string;
  userClass?: null | string;
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  roomId?: number | string;
  roomName?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  roomCapacity?: null | number | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  roomType?: number | string;
  roomFloor?: null | string;
  roomAddress?: null | string;
  /** @format date-time */
  startTime?: string;
  /** @format date-time */
  endTime?: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  status?: number | string;
  notes?: null | string;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: null | string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  registrationCount?: number | string;
}

export interface CreateBookingDto {
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  userId: number | string;
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  roomId: number | string;
  /** @format date-time */
  startTime: string;
  /** @format date-time */
  endTime: string;
  notes: null | string;
  /**
   * @format int32
   * @default 0
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  status?: number | string;
}

export interface CreateRoomDto {
  name: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  capacity: null | number | string;
  type: RoomType;
  floor: null | string;
  address: null | string;
  notes: null | string;
}

export interface CreateUserDto {
  email: string;
  displayName: null | string;
  role: UserRole;
  password: string;
  userClass: null | string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  displayName?: null | string;
}

export interface RoomResponseDto {
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  id: number | string;
  name: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  capacity: null | number | string;
  type: RoomType;
  floor: null | string;
  address: null | string;
  notes: null | string;
}

export interface UpdateRoomDto {
  name: string;
  /**
   * @format int32
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  capacity: null | number | string;
  type: RoomType;
  floor: null | string;
  address: null | string;
  notes: null | string;
}

export interface UpdateUserDto {
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  id: number | string;
  email: string;
  displayName: null | string;
  role: UserRole;
  password: string;
  userClass: null | string;
  isBanned: BannedStatus;
}

export interface UserResponseDto {
  /**
   * @format int64
   * @pattern ^-?(?:0|[1-9]\d*)$
   */
  id: number | string;
  email: string;
  displayName: null | string;
  role: UserRole;
  userClass: null | string;
}
