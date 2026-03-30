import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  ValidateIf,
} from 'class-validator';
import { US_STATE_CODES } from '../constants/us-states';

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
  kind!: PersonKindDto;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ example: '1234 Jayhawk Blvd' })
  @IsString()
  @MinLength(1)
  addressLine1!: string;

  @ApiProperty({ example: 'Lawrence' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city!: string;

  @ApiProperty({ description: 'US state or DC (2-letter)', example: 'KS', enum: US_STATE_CODES })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @IsIn(US_STATE_CODES)
  state!: string;

  @ApiProperty({ example: '66045' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  zip!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '785-555-0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Graduation / pledge class year (members only)',
    example: 2027,
  })
  @ValidateIf((o: CreatePersonDto) => o.kind === PersonKindDto.MEMBER || o.kind === PersonKindDto.BOTH)
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  pledgeClassYear?: number;
}
