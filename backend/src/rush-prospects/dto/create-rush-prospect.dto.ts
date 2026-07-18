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

export class CreateRushProspectDto {
  // ── Required contact fields ──────────────────────────────────────────────

  @ApiProperty({ example: 'Connor' })
  @IsString()
  @MaxLength(100)
  firstName!: string

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MaxLength(100)
  lastName!: string

  @ApiProperty({ example: 'connor.smith@ku.edu' })
  @IsEmail()
  @MaxLength(255)
  email!: string

  @ApiProperty({ example: '913-555-0100' })
  @IsString()
  @MaxLength(30)
  phone!: string

  @ApiProperty({
    example: 'freshman',
    enum: ['freshman', 'sophomore', 'junior', 'senior', 'other'],
  })
  @IsEnum(['freshman', 'sophomore', 'junior', 'senior', 'other'])
  classYear!: string

  // ── Optional contact fields ──────────────────────────────────────────────

  @ApiProperty({ example: 'Overland Park, KS', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  hometown?: string

  @ApiProperty({ example: 'Blue Valley Northwest', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  highSchool?: string

  // ── Enrollment ───────────────────────────────────────────────────────────

  @ApiProperty({ example: 'fall', enum: ['fall', 'spring'], required: false })
  @IsOptional()
  @IsEnum(['fall', 'spring'])
  enrollmentSemester?: string

  @ApiProperty({ example: 2026, required: false })
  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2040)
  enrollmentYear?: number

  // ── Academic (optional) ──────────────────────────────────────────────────

  @ApiProperty({ example: 'Business Finance', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  major?: string

  @ApiProperty({ example: 3.85, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(4)
  gpa?: number

  @ApiProperty({ example: 32, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  actScore?: number

  @ApiProperty({ example: 1420, required: false })
  @IsOptional()
  @IsInt()
  @Min(400)
  @Max(1600)
  satScore?: number

  @ApiProperty({ example: 'Basketball, Student Council', required: false })
  @IsOptional()
  @IsString()
  sportsActivities?: string

  @ApiProperty({ example: 'National Honor Society, Eagle Scout', required: false })
  @IsOptional()
  @IsString()
  honorsAwards?: string

  // ── Legacy (optional, mutually exclusive) ────────────────────────────────

  @ApiProperty({
    description: 'UUID of the matched Alpha Nu member (set when selected from member search)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  legacyRelativePersonId?: string

  @ApiProperty({
    description: 'Free-text name when relative is not found in member directory',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legacyRelativeName?: string

  @ApiProperty({
    example: 'father',
    enum: ['father', 'grandfather', 'great_grandfather', 'uncle', 'brother', 'cousin'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['father', 'grandfather', 'great_grandfather', 'uncle', 'brother', 'cousin'])
  legacyRelationship?: string

  // ── Referral ─────────────────────────────────────────────────────────────

  @ApiProperty({ example: 'A current member', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referralSource?: string
}
