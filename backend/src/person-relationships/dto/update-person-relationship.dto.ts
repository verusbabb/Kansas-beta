import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator'
import { PERSON_RELATIONSHIP_TYPES } from '../constants/relationship-types'

export class UpdatePersonRelationshipDto {
  @ApiPropertyOptional({
    description: 'Set or clear relationship label; null clears to unspecified',
    enum: PERSON_RELATIONSHIP_TYPES,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @IsIn([...PERSON_RELATIONSHIP_TYPES])
  relationshipType?: string | null

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(2000)
  notes?: string | null
}
