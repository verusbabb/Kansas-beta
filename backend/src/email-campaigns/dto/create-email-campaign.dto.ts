import { ApiProperty } from '@nestjs/swagger'
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator'

const AUDIENCE_TYPES = ['everyone', 'all_members', 'all_parents', 'class_years', 'custom'] as const

export class CreateEmailCampaignDto {
  @ApiProperty({ example: 'You are invited to Parents Weekend!' })
  @IsString()
  @MaxLength(255)
  subject!: string

  @ApiProperty({ example: '<p>Join us for Parents Weekend...</p>' })
  @IsString()
  bodyHtml!: string

  @ApiProperty({ enum: AUDIENCE_TYPES, example: 'class_years' })
  @IsEnum(AUDIENCE_TYPES)
  audienceType!: (typeof AUDIENCE_TYPES)[number]

  @ApiProperty({
    type: [Number],
    required: false,
    description: "Pledge class years (required when audienceType is 'class_years')",
    example: [2025, 2026],
  })
  @ValidateIf((o) => o.audienceType === 'class_years')
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1900, { each: true })
  @Max(2100, { each: true })
  audienceClassYears?: number[]

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  audienceIncludeMembers?: boolean

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  audienceIncludeParents?: boolean

  @ApiProperty({
    type: [String],
    required: false,
    description: "Person UUIDs (required when audienceType is 'custom')",
  })
  @ValidateIf((o) => o.audienceType === 'custom')
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  audiencePersonIds?: string[]
}
