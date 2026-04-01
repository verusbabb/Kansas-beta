import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateExecTermDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string | null

  @ApiPropertyOptional({ description: 'If true, unset isCurrent on all other terms' })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean
}
