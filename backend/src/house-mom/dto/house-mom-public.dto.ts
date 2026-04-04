import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class HouseMomPublicDto {
  @ApiProperty()
  id!: string

  @ApiProperty()
  firstName!: string

  @ApiProperty()
  lastName!: string

  @ApiProperty()
  email!: string

  @ApiPropertyOptional({ nullable: true })
  phone?: string | null

  @ApiPropertyOptional({
    nullable: true,
    description: 'Rich text HTML from admin editor; empty until configured.',
  })
  bioHtml?: string | null

  @ApiPropertyOptional({
    nullable: true,
    description: 'Short-lived signed URL when a photo is stored.',
  })
  photoUrl?: string | null
}
