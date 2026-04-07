import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator'
import { US_STATE_CODES } from '../constants/us-states'

function trimEmptyToUndefined({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return value
  const t = value.trim()
  return t.length ? t : undefined
}

function trimStateToUndefined({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') return value
  const t = value.trim().toUpperCase()
  return t.length ? t : undefined
}

export enum PersonKindDto {
  MEMBER = 'member',
  PARENT = 'parent',
  BOTH = 'both',
}

export class CreatePersonDto {
  @ApiProperty({
    description: 'Whether this person is a chapter member, a parent, or both',
    enum: PersonKindDto,
    example: PersonKindDto.MEMBER,
  })
  @IsEnum(PersonKindDto)
  kind!: PersonKindDto

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  firstName!: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  lastName!: string

  @ApiPropertyOptional({ example: '1234 Jayhawk Blvd' })
  @Transform(trimEmptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  addressLine1?: string

  @ApiPropertyOptional({ example: 'Lawrence' })
  @Transform(trimEmptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string

  @ApiPropertyOptional({
    description: 'US state or DC (2-letter) when provided',
    example: 'KS',
    enum: US_STATE_CODES,
  })
  @Transform(trimStateToUndefined)
  @IsOptional()
  @IsIn(US_STATE_CODES)
  state?: string

  @ApiPropertyOptional({ example: '66045' })
  @Transform(trimEmptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  zip?: string

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string

  @ApiPropertyOptional({
    description: 'Optional CRM contact id (e.g. Salesforce) for import-linked rows',
    example: '003UQ00000p4lyE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  externalContactId?: string

  @ApiPropertyOptional({ example: '785-555-0100' })
  @IsOptional()
  @IsString()
  homePhone?: string

  @ApiPropertyOptional({ example: '785-555-0101' })
  @IsOptional()
  @IsString()
  mobilePhone?: string

  @ApiPropertyOptional({
    example: 'https://www.linkedin.com/in/example',
    description: 'Public LinkedIn profile URL',
  })
  @Transform(trimEmptyToUndefined)
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'LinkedIn must be a valid http(s) URL' })
  @MaxLength(512)
  linkedinProfileUrl?: string

  @ApiPropertyOptional({
    description: 'Graduation / pledge class year (members only)',
    example: 2027,
  })
  @ValidateIf(
    (o: CreatePersonDto) => o.kind === PersonKindDto.MEMBER || o.kind === PersonKindDto.BOTH,
  )
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  pledgeClassYear?: number
}
