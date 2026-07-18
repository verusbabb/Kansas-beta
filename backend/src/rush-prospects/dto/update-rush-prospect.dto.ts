import { ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class UpdateRushProspectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hometown?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  highSchool?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['freshman', 'sophomore', 'junior', 'senior', 'other'])
  classYear?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['fall', 'spring'])
  enrollmentSemester?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2040)
  enrollmentYear?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  major?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  actScore?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(400)
  @Max(1600)
  satScore?: number

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sportsActivities?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  honorsAwards?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  legacyRelativePersonId?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legacyRelativeName?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(['father', 'grandfather', 'great_grandfather', 'uncle', 'brother', 'cousin'])
  legacyRelationship?: string | null

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referralSource?: string

  @ApiProperty({
    required: false,
    enum: [
      'inquiry',
      'screened',
      'active',
      'priority',
      'bid_pending',
      'bid_extended',
      'bid_accepted',
      'bid_declined',
      'no_bid',
      'withdrawn',
    ],
  })
  @IsOptional()
  @IsEnum([
    'inquiry',
    'screened',
    'active',
    'priority',
    'bid_pending',
    'bid_extended',
    'bid_accepted',
    'bid_declined',
    'no_bid',
    'withdrawn',
  ])
  pipelineStage?: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  assignedToPersonId?: string | null

  @ApiProperty({ required: false, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  internalRating?: number | null
}
