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

  @ApiPropertyOptional({
    nullable: true,
    description: 'Null for guests or when the member has opted out of sharing email with signed-in members.',
  })
  email?: string | null

  @ApiPropertyOptional({
    description: 'True when an email is stored; use with `email: null` for redacted display.',
  })
  hasEmailOnFile?: boolean

  @ApiPropertyOptional({
    description: 'External CRM contact id when linked (e.g. Salesforce); null if added only in this app or when redacted.',
    nullable: true,
  })
  externalContactId?: string | null

  @ApiPropertyOptional()
  homePhone?: string | null

  @ApiPropertyOptional()
  mobilePhone?: string | null

  @ApiProperty({
    description:
      'True when a mobile number is stored; present even when `mobilePhone` is omitted for privacy.',
  })
  hasMobilePhone!: boolean

  @ApiProperty({
    description: 'True when a home number is stored; present even when `homePhone` is omitted for privacy.',
  })
  hasHomePhone!: boolean

  @ApiPropertyOptional()
  pledgeClassYear?: number | null

  @ApiPropertyOptional({
    description: 'LinkedIn profile URL when provided and visible',
    nullable: true,
  })
  linkedinProfileUrl?: string | null

  @ApiPropertyOptional({
    description: 'True when a LinkedIn URL is stored; use when `linkedinProfileUrl` is null for redacted display.',
  })
  hasLinkedInOnFile?: boolean

  @ApiPropertyOptional({
    description: 'True when any mailing-address field is stored; use when address fields are null for redacted display.',
  })
  hasAddressOnFile?: boolean

  @ApiPropertyOptional({
    description: 'Present when viewing your own profile or editor/admin full rows.',
  })
  shareEmailWithLoggedInMembers?: boolean

  @ApiPropertyOptional({
    description: 'Present when viewing your own profile or editor/admin full rows.',
  })
  sharePhonesWithLoggedInMembers?: boolean

  @ApiPropertyOptional({
    description: 'Present when viewing your own profile or editor/admin full rows.',
  })
  shareAddressWithLoggedInMembers?: boolean

  @ApiPropertyOptional({
    description: 'Present when viewing your own profile or editor/admin full rows.',
  })
  shareLinkedInWithLoggedInMembers?: boolean

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
    description: 'True if a directory/profile headshot is stored (GCS).',
  })
  hasProfileHeadshot?: boolean

  @ApiPropertyOptional({
    description: 'True if an executive roster (era) headshot is stored (GCS).',
  })
  hasExecRosterHeadshot?: boolean

  @ApiProperty()
  createdAt!: Date

  @ApiProperty()
  updatedAt!: Date
}
