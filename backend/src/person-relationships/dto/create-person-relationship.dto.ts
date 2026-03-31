import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator'
import { PERSON_RELATIONSHIP_TYPES } from '../constants/relationship-types'

export enum PersonRelationshipConnectDirectionDto {
  /** Counterpart is `from`; viewer (`personId` in URL) is `to` — e.g. Bob is Sam’s uncle when viewer is Sam. */
  OTHER_IS_FROM = 'other_is_from',
  /** Viewer is `from`; counterpart is `to` — e.g. Bob is Sam’s uncle when viewer is Bob. */
  OTHER_IS_TO = 'other_is_to',
}

export class CreatePersonRelationshipDto {
  @ApiProperty({ description: 'The other person in the relationship' })
  @IsUUID('4')
  otherPersonId!: string

  @ApiProperty({ enum: PersonRelationshipConnectDirectionDto })
  @IsEnum(PersonRelationshipConnectDirectionDto)
  direction!: PersonRelationshipConnectDirectionDto

  @ApiPropertyOptional({
    description:
      'How `from` relates to `to` (omit or null if unknown). See API docs for directed semantics.',
    enum: PERSON_RELATIONSHIP_TYPES,
    nullable: true,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @IsIn([...PERSON_RELATIONSHIP_TYPES])
  relationshipType?: string | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
