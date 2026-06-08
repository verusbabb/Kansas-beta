import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsInt, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class RecordLoginDto {
  @ApiProperty({ description: 'Auth0 user_id (sub)', example: 'auth0|abc123' })
  @IsString()
  auth0Id!: string

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ description: "Auth0's logins_count for this user", example: 5 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  loginsCount!: number
}
