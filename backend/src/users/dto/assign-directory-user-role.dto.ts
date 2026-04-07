import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { UserRole } from '../../database/entities/user.entity'

export class AssignDirectoryUserRoleDto {
  @ApiProperty({
    description: 'App role for this directory person',
    enum: UserRole,
    example: UserRole.VIEWER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: viewer, editor, admin',
  })
  role!: UserRole
}
