import { ApiProperty } from '@nestjs/swagger'
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  Max,
  ValidateIf,
} from 'class-validator'

const AUDIENCE_TYPES = ['everyone', 'all_members', 'all_parents', 'class_years', 'custom'] as const

/** Request body to preview how many people an audience definition resolves to. */
export class PreviewRecipientsDto {
  @ApiProperty({ enum: AUDIENCE_TYPES })
  @IsEnum(AUDIENCE_TYPES)
  audienceType!: (typeof AUDIENCE_TYPES)[number]

  @ApiProperty({ type: [Number], required: false })
  @ValidateIf((o) => o.audienceType === 'class_years')
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1900, { each: true })
  @Max(2100, { each: true })
  audienceClassYears?: number[]

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  audienceIncludeMembers?: boolean

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  audienceIncludeParents?: boolean

  @ApiProperty({ type: [String], required: false })
  @ValidateIf((o) => o.audienceType === 'custom')
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  audiencePersonIds?: string[]
}

export class RecipientPreviewItemDto {
  @ApiProperty() id!: string
  @ApiProperty() firstName!: string
  @ApiProperty() lastName!: string
  @ApiProperty() email!: string
}

export class PreviewRecipientsResponseDto {
  @ApiProperty() count!: number
  @ApiProperty({ type: [RecipientPreviewItemDto], description: 'First few recipients (sample)' })
  sample!: RecipientPreviewItemDto[]
}
