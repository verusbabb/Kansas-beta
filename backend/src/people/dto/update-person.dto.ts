import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
} from 'class-validator';
import { US_STATE_CODES } from '../constants/us-states';
import { PersonKindDto } from './create-person.dto';

export class UpdatePersonDto {
  @ApiPropertyOptional({ enum: PersonKindDto })
  @IsOptional()
  @IsEnum(PersonKindDto)
  kind?: PersonKindDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'US state or DC (2-letter)', enum: US_STATE_CODES })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null
      ? value
      : typeof value === 'string'
        ? value.trim().toUpperCase()
        : value,
  )
  @IsString()
  @IsIn(US_STATE_CODES)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  zip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  /** Omit to leave unchanged; send null to clear when person is a member. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  pledgeClassYear?: number | null;
}
