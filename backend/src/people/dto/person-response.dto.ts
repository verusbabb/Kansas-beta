import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PersonResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiPropertyOptional({ nullable: true })
  addressLine1?: string | null

  @ApiPropertyOptional({ nullable: true })
  city?: string | null

  @ApiPropertyOptional({ nullable: true })
  state?: string | null

  @ApiPropertyOptional({ nullable: true })
  zip?: string | null

  @ApiProperty()
  email!: string

  @ApiPropertyOptional({
    description: 'External CRM contact id when linked (e.g. Salesforce); null if added only in this app.',
  })
  externalContactId?: string | null

  @ApiPropertyOptional()
  homePhone?: string | null

  @ApiPropertyOptional()
  mobilePhone?: string | null

  @ApiPropertyOptional()
  pledgeClassYear?: number | null

  @ApiProperty()
  isMember!: boolean

  @ApiProperty()
  isParent!: boolean

  @ApiProperty({
    description:
      'True if this person has at least one relationship where both endpoints are listed as chapter members (member↔member “legacy” link, not parent↔member).',
  })
  hasLegacyMemberLink!: boolean

  @ApiPropertyOptional({
    description: 'True if a headshot image is stored (GCS); used for exec team display.',
  })
  hasHeadshot?: boolean

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}
