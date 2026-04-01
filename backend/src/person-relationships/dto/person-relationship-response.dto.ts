import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PersonRelationshipCounterpartDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiProperty()
  email!: string

  @ApiProperty()
  isMember!: boolean

  @ApiProperty()
  isParent!: boolean

  @ApiProperty({
    description: 'True if this person is soft-deleted but the link is still listed',
  })
  removedFromDirectory!: boolean

  @ApiPropertyOptional({
    description: 'Pledge class year when counterpart is a member (PC year)',
    nullable: true,
  })
  pledgeClassYear?: number | null
}

export class PersonRelationshipResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  fromPersonId!: string

  @ApiProperty()
  toPersonId!: string

  @ApiProperty({ type: PersonRelationshipCounterpartDto })
  counterpart!: PersonRelationshipCounterpartDto

  @ApiPropertyOptional({
    description: 'How `from` relates to `to`; null if not specified',
    nullable: true,
  })
  relationshipType!: string | null

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null

  @ApiProperty({
    description: 'True if the viewer (`personId` in URL) is `fromPersonId`',
  })
  viewerIsFrom!: boolean

  @ApiProperty({
    description:
      'Viewer-centric role of the counterpart (e.g. Father, Son, Brother) for table-style display',
  })
  viewerCounterpartRoleLabel!: string

  @ApiProperty({
    description: 'Legacy = both are members; Family = kin (except peer brother when both members)',
    enum: ['legacy', 'family'],
    isArray: true,
  })
  connectionTags!: ('legacy' | 'family')[]

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}
