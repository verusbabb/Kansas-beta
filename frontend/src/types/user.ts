/**
 * User types matching backend DTOs
 */

export enum UserRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export interface UserResponseDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  auth0Id: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserDto {
  email: string
  firstName: string
  lastName: string
  role: UserRole
}

export interface UpdateUserDto {
  email?: string
  firstName?: string
  lastName?: string
  role?: UserRole
}

