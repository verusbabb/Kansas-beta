import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.VIEWER,
  })
  role!: UserRole;

  @ApiProperty({
    description: 'Auth0 user ID (null until user signs up in Auth0)',
    example: 'auth0|123456789',
    nullable: true,
  })
  auth0Id!: string | null;

  @ApiProperty({
    description: 'Timestamp when the user was created',
    example: '2023-10-27T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the user was last updated',
    example: '2023-10-27T10:00:00.000Z',
  })
  updatedAt!: Date;
}

