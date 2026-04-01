import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateExecTermDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(1990)
  @Max(2100)
  year!: number

  @ApiProperty({ enum: ['fall', 'spring'] })
  @IsString()
  @IsIn(['fall', 'spring'])
  season!: 'fall' | 'spring'

  @ApiPropertyOptional({ example: 'Spring 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string

  @ApiPropertyOptional({ description: 'If true, unset isCurrent on all other terms' })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean
}
