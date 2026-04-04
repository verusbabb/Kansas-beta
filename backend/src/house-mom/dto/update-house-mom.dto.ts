import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateHouseMomDto {
  @IsString()
  @MaxLength(120)
  firstName!: string

  @IsString()
  @MaxLength(120)
  lastName!: string

  @IsString()
  @MaxLength(255)
  email!: string

  @IsOptional()
  @IsString()
  @MaxLength(64)
  phone?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  bioHtml?: string | null
}
