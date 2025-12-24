import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../database/entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1, { message: 'First name cannot be empty' })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1, { message: 'Last name cannot be empty' })
  lastName!: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.VIEWER,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: viewer, editor, admin',
  })
  role!: UserRole;
}

