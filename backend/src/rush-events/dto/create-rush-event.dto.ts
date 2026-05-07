import { ApiProperty } from '@nestjs/swagger'
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateRushEventDto {
  @ApiProperty({ example: 'Open House' })
  @IsString()
  @MaxLength(255)
  title!: string

  @ApiProperty({
    description: 'Label shown on the timeline (e.g. Fall 2026, Sep 12, TBD)',
    example: 'Fall 2026',
  })
  @IsString()
  @MaxLength(255)
  displayDate!: string

  @ApiProperty({
    description: 'Rich text body (HTML)',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({
    description: 'PrimeIcons class for the timeline marker',
    example: 'pi pi-calendar',
    default: 'pi pi-calendar',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  icon?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string

  @ApiProperty({
    description: 'Free-text time line (e.g. 6:00 PM CT)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  timeLabel?: string

  @ApiProperty({
    description: 'Sort order (lower first)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
