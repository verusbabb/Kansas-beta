import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { US_STATE_CODES } from '../constants/us-states'
import { PersonKindDto } from './create-person.dto'

function patchTextOrNull({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return value
  const t = value.trim()
  return t.length ? t : null
}

function patchStateOrNull({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return value
  const t = value.trim().toUpperCase()
  return t.length ? t : null
}

export class UpdatePersonDto {
  @ApiPropertyOptional({ enum: PersonKindDto })
  @IsOptional()
  @IsEnum(PersonKindDto)
  kind?: PersonKindDto

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string

  @ApiPropertyOptional({ description: 'Omit to leave unchanged; null clears' })
  @IsOptional()
  @Transform(patchTextOrNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(2000)
  addressLine1?: string | null

  @ApiPropertyOptional({ description: 'Omit to leave unchanged; null clears' })
  @IsOptional()
  @Transform(patchTextOrNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(100)
  city?: string | null

  @ApiPropertyOptional({
    description: 'US state or DC (2-letter); omit unchanged; null clears',
    enum: US_STATE_CODES,
  })
  @IsOptional()
  @Transform(patchStateOrNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @IsIn(US_STATE_CODES)
  state?: string | null

  @ApiPropertyOptional({ description: 'Omit to leave unchanged; null clears' })
  @IsOptional()
  @Transform(patchTextOrNull)
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(20)
  zip?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({
    description: 'CRM contact id; send null to clear',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(64)
  externalContactId?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  homePhone?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobilePhone?: string | null

  /** Omit to leave unchanged; send null to clear when person is a member. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  pledgeClassYear?: number | null
}
