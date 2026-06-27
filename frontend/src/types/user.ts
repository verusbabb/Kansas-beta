/**
 * User types matching backend DTOs
 */

export enum UserRole {
  VIEWER = 'viewer',
  MEMBER = 'member',
  RUSH_CHAIR = 'rush_chair',
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
  /** Linked directory person when unambiguous email match exists. */
  personId?: string | null
  createdAt: string
  updatedAt: string
  isProtected?: boolean
  lastLoginAt?: string | null
  loginCount?: number
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

export interface BulkInviteDto {
  personIds: string[]
  dryRun?: boolean
}

export interface BulkInviteResultDto {
  total: number
  skipped: number
  invited: number
  failed: number
}

