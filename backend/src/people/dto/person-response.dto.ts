import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PersonResponseDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiProperty()
  addressLine1!: string

  @ApiProperty()
  city!: string

  @ApiProperty()
  state!: string

  @ApiProperty()
  zip!: string

  @ApiProperty()
  email!: string

  @ApiPropertyOptional()
  phone?: string | null

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
